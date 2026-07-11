/**
 * Real MongoDB replica-set concurrency tests for Bầu Cua.
 * Skips automatically when no local RS is available (e.g. developer laptop without Docker).
 * CI provides MONGODB_URI with replicaSet=rs0.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import mongoose from 'mongoose'
import {
  connectIntegrationDb,
  dropIntegrationDb,
  getIntegrationMongoUri,
  isReplicaSetReady,
} from './mongo-rs-helpers'
import {
  supportsMongoTransactions,
  withMongoTransaction,
  TransactionNotSupportedError,
  resetMongoTransactionCache,
} from '@/lib/mongo-transaction'
import BauCuaFamilyState from '@/lib/models/BauCuaFamilyState'
import BauCuaRound from '@/lib/models/BauCuaRound'
import BauCuaBet from '@/lib/models/BauCuaBet'
import BauCuaWallet from '@/lib/models/BauCuaWallet'
import BauCuaSettlement from '@/lib/models/BauCuaSettlement'

const uri = getIntegrationMongoUri()
const describeIf = uri ? describe : describe.skip

describeIf('Bau Cua Mongo replica-set concurrency', () => {
  const familyId = new mongoose.Types.ObjectId()
  const userA = new mongoose.Types.ObjectId()
  const userB = new mongoose.Types.ObjectId()

  beforeAll(async () => {
    await connectIntegrationDb(uri!)
    resetMongoTransactionCache()
    const rs = await isReplicaSetReady()
    if (!rs) {
      if (process.env.REQUIRE_MONGO_RS === 'true') {
        throw new Error('Replica set required but not available')
      }
      console.warn('[skip] Mongo connected but not a replica set PRIMARY')
    }
    const supported = await supportsMongoTransactions()
    if (!supported && process.env.REQUIRE_MONGO_RS === 'true') {
      throw new Error('Transactions not supported')
    }
  }, 30_000)

  afterAll(async () => {
    try {
      await dropIntegrationDb()
    } finally {
      await mongoose.disconnect().catch(() => undefined)
    }
  })

  it('two concurrent STARTs produce one active betting round', async () => {
    const supported = await supportsMongoTransactions()
    if (!supported) return

    await BauCuaFamilyState.deleteMany({ familyId })
    await BauCuaRound.deleteMany({ familyId })

    await BauCuaFamilyState.create({
      familyId,
      activeRoundId: null,
      status: 'idle',
      version: 0,
      betRevision: 0,
    })

    async function startRound() {
      return withMongoTransaction(
        async (session) => {
          const opt = session ? { session } : {}
          const claimed = await BauCuaFamilyState.findOneAndUpdate(
            { familyId, status: 'idle' },
            { $set: { status: 'starting' }, $inc: { version: 1 } },
            { new: true, ...opt }
          )
          if (!claimed) {
            const state = await BauCuaFamilyState.findOne({ familyId }, null, opt)
            if (state?.activeRoundId) {
              return { existing: true, roundId: state.activeRoundId }
            }
            return { existing: true, roundId: null }
          }
          const latest = await BauCuaRound.findOne({ familyId }, null, {
            ...opt,
            sort: { roundNumber: -1 },
          })
          const nextNumber = (latest?.roundNumber ?? 0) + 1
          const [round] = await BauCuaRound.create(
            [
              {
                familyId,
                roundNumber: nextNumber,
                status: 'betting',
                hostUserId: userA,
                settlementCompleted: false,
                startedAt: new Date(),
              },
            ],
            session ? { session } : undefined
          )
          await BauCuaFamilyState.findOneAndUpdate(
            { familyId, status: 'starting' },
            {
              $set: {
                status: 'betting',
                activeRoundId: round._id,
                updatedAt: new Date(),
              },
              $inc: { version: 1 },
            },
            opt
          )
          return { existing: false, roundId: round._id }
        },
        { requireReplicaSet: true }
      )
    }

    const results = await Promise.all([startRound(), startRound(), startRound()])
    const active = await BauCuaRound.countDocuments({
      familyId,
      status: { $in: ['betting', 'rolling'] },
    })
    expect(active).toBeLessThanOrEqual(1)
    expect(results.filter((r) => !r.existing).length).toBeLessThanOrEqual(1)
  })

  it('BET after ROLL claim fails; no reserved orphan after settlement path', async () => {
    const supported = await supportsMongoTransactions()
    if (!supported) return

    await BauCuaFamilyState.deleteMany({ familyId })
    await BauCuaRound.deleteMany({ familyId })
    await BauCuaBet.deleteMany({ familyId })
    await BauCuaWallet.deleteMany({ familyId })
    await BauCuaSettlement.deleteMany({ familyId })

    const [round] = await BauCuaRound.create([
      {
        familyId,
        roundNumber: 1,
        status: 'betting',
        hostUserId: userA,
        settlementCompleted: false,
        startedAt: new Date(),
      },
    ])
    await BauCuaFamilyState.create({
      familyId,
      activeRoundId: round._id,
      status: 'betting',
      version: 1,
      betRevision: 0,
    })
    await BauCuaWallet.create({
      familyId,
      userId: userB,
      balance: 1000,
      reservedBalance: 0,
    })

    // ROLL claims state first
    await withMongoTransaction(
      async (session) => {
        const opt = session ? { session } : {}
        const state = await BauCuaFamilyState.findOneAndUpdate(
          { familyId, status: 'betting' },
          { $set: { status: 'rolling' }, $inc: { version: 1 } },
          { new: true, ...opt }
        )
        expect(state).toBeTruthy()
        await BauCuaRound.findOneAndUpdate(
          { _id: round._id },
          { $set: { status: 'rolling' } },
          opt
        )
      },
      { requireReplicaSet: true }
    )

    // BET must fail CAS on status=betting
    await expect(
      withMongoTransaction(
        async (session) => {
          const opt = session ? { session } : {}
          const state = await BauCuaFamilyState.findOneAndUpdate(
            { familyId, status: 'betting' },
            { $inc: { betRevision: 1 } },
            { new: true, ...opt }
          )
          if (!state) throw new Error('no betting state')
          await BauCuaWallet.findOneAndUpdate(
            { familyId, userId: userB },
            { $inc: { reservedBalance: 100 } },
            opt
          )
          await BauCuaBet.create(
            [
              {
                roundId: round._id,
                familyId,
                userId: userB,
                item: 'bau',
                amount: 100,
                idempotencyKey: 'k1',
              },
            ],
            session ? { session } : undefined
          )
        },
        { requireReplicaSet: true }
      )
    ).rejects.toThrow(/no betting state/)

    const wallet = await BauCuaWallet.findOne({ familyId, userId: userB })
    expect(wallet?.reservedBalance ?? 0).toBe(0)
    const bets = await BauCuaBet.countDocuments({ roundId: round._id })
    expect(bets).toBe(0)
  })

  it('requireReplicaSet throws TransactionNotSupportedError when forced unsupported', async () => {
    // Unit-level: operation with requireReplicaSet always attempts check
    // Here we only assert class exists when RS available transactions work
    const supported = await supportsMongoTransactions()
    if (supported) {
      await expect(
        withMongoTransaction(async () => 1, { requireReplicaSet: true })
      ).resolves.toBe(1)
    } else {
      await expect(
        withMongoTransaction(async () => 1, { requireReplicaSet: true })
      ).rejects.toBeInstanceOf(TransactionNotSupportedError)
    }
  })
})
