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

  it('20 concurrent BET reservations never exceed wallet balance', async () => {
    const supported = await supportsMongoTransactions()
    if (!supported) return

    await BauCuaFamilyState.deleteMany({ familyId })
    await BauCuaRound.deleteMany({ familyId })
    await BauCuaBet.deleteMany({ familyId })
    await BauCuaWallet.deleteMany({ familyId })

    const [round] = await BauCuaRound.create([
      {
        familyId,
        roundNumber: 10,
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

    const amount = 100
    // 20 bets of 100 = 2000 > balance 1000 → at most 10 succeed
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, (_, i) =>
        withMongoTransaction(
          async (session) => {
            const opt = session ? { session } : {}
            const state = await BauCuaFamilyState.findOneAndUpdate(
              { familyId, status: 'betting', activeRoundId: round._id },
              { $inc: { betRevision: 1 } },
              { new: true, ...opt }
            )
            if (!state) throw new Error('not betting')
            const wallet = await BauCuaWallet.findOneAndUpdate(
              {
                familyId,
                userId: userB,
                $expr: {
                  $gte: [{ $subtract: ['$balance', '$reservedBalance'] }, amount],
                },
              },
              { $inc: { reservedBalance: amount } },
              { new: true, ...opt }
            )
            if (!wallet) throw new Error('insufficient')
            await BauCuaBet.create(
              [
                {
                  roundId: round._id,
                  familyId,
                  userId: userB,
                  item: 'bau',
                  amount,
                  idempotencyKey: `parallel-${i}`,
                },
              ],
              session ? { session } : undefined
            )
            return true
          },
          { requireReplicaSet: true }
        )
      )
    )

    const ok = results.filter((r) => r.status === 'fulfilled').length
    expect(ok).toBeLessThanOrEqual(10)
    expect(ok).toBeGreaterThan(0)

    const wallet = await BauCuaWallet.findOne({ familyId, userId: userB })
    expect(wallet!.reservedBalance).toBeLessThanOrEqual(1000)
    expect(wallet!.reservedBalance).toBe(ok * amount)
    expect(wallet!.reservedBalance).toBeGreaterThanOrEqual(0)

    const betCount = await BauCuaBet.countDocuments({ roundId: round._id })
    expect(betCount).toBe(ok)
  })

  it('two concurrent ROLL CAS produce one settlement at most', async () => {
    const supported = await supportsMongoTransactions()
    if (!supported) return

    await BauCuaFamilyState.deleteMany({ familyId })
    await BauCuaRound.deleteMany({ familyId })
    await BauCuaSettlement.deleteMany({ familyId })

    const [round] = await BauCuaRound.create([
      {
        familyId,
        roundNumber: 20,
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

    async function claimRoll() {
      return withMongoTransaction(
        async (session) => {
          const opt = session ? { session } : {}
          const state = await BauCuaFamilyState.findOneAndUpdate(
            { familyId, status: 'betting' },
            { $set: { status: 'rolling' }, $inc: { version: 1 } },
            { new: true, ...opt }
          )
          if (!state) throw new Error('lost race')
          const existing = await BauCuaSettlement.findOne({ roundId: round._id }, null, opt)
          if (existing) return 'existing'
          await BauCuaSettlement.create(
            [
              {
                roundId: round._id,
                familyId,
                diceResults: ['bau', 'cua', 'tom'],
                entries: [],
                status: 'completed',
                createdAt: new Date(),
                completedAt: new Date(),
              },
            ],
            session ? { session } : undefined
          )
          await BauCuaRound.findOneAndUpdate(
            { _id: round._id },
            {
              $set: {
                status: 'rolled',
                settlementCompleted: true,
                diceResults: ['bau', 'cua', 'tom'],
              },
            },
            opt
          )
          await BauCuaFamilyState.findOneAndUpdate(
            { familyId },
            { $set: { status: 'idle', activeRoundId: null }, $inc: { version: 1 } },
            opt
          )
          return 'created'
        },
        { requireReplicaSet: true }
      )
    }

    const outcomes = await Promise.allSettled([claimRoll(), claimRoll()])
    const created = outcomes.filter(
      (o) => o.status === 'fulfilled' && o.value === 'created'
    ).length
    expect(created).toBeLessThanOrEqual(1)

    const settlements = await BauCuaSettlement.countDocuments({ roundId: round._id })
    expect(settlements).toBeLessThanOrEqual(1)
  })

  it('duplicate idempotency key does not double-reserve', async () => {
    const supported = await supportsMongoTransactions()
    if (!supported) return

    await BauCuaFamilyState.deleteMany({ familyId })
    await BauCuaRound.deleteMany({ familyId })
    await BauCuaBet.deleteMany({ familyId })
    await BauCuaWallet.deleteMany({ familyId })

    const [round] = await BauCuaRound.create([
      {
        familyId,
        roundNumber: 30,
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

    async function place(key: string) {
      return withMongoTransaction(
        async (session) => {
          const opt = session ? { session } : {}
          const existing = await BauCuaBet.findOne(
            { roundId: round._id, userId: userB, idempotencyKey: key },
            null,
            opt
          )
          if (existing) return 'idempotent'
          await BauCuaFamilyState.findOneAndUpdate(
            { familyId, status: 'betting' },
            { $inc: { betRevision: 1 } },
            opt
          )
          const wallet = await BauCuaWallet.findOneAndUpdate(
            {
              familyId,
              userId: userB,
              $expr: {
                $gte: [{ $subtract: ['$balance', '$reservedBalance'] }, 50],
              },
            },
            { $inc: { reservedBalance: 50 } },
            { new: true, ...opt }
          )
          if (!wallet) throw new Error('insufficient')
          try {
            await BauCuaBet.create(
              [
                {
                  roundId: round._id,
                  familyId,
                  userId: userB,
                  item: 'cua',
                  amount: 50,
                  idempotencyKey: key,
                },
              ],
              session ? { session } : undefined
            )
          } catch (e: unknown) {
            const err = e as { code?: number }
            if (err.code === 11000) throw e // abort TX — do not continue
            throw e
          }
          return 'created'
        },
        { requireReplicaSet: true }
      )
    }

    const first = await place('same-key')
    expect(first).toBe('created')
    const second = await place('same-key')
    expect(second).toBe('idempotent')

    const wallet = await BauCuaWallet.findOne({ familyId, userId: userB })
    expect(wallet?.reservedBalance).toBe(50)
    expect(await BauCuaBet.countDocuments({ roundId: round._id })).toBe(1)
  })
})
