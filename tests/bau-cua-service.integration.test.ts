/**
 * Integration tests call PRODUCTION services (not reimplemented TX logic).
 * Skips when MONGODB_URI is unset at import; fails in CI when RS required but missing.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import mongoose from 'mongoose'
import {
  connectIntegrationDb,
  dropIntegrationDb,
  getIntegrationMongoUri,
  isReplicaSetReady,
} from './mongo-rs-helpers'
import { resetMongoTransactionCache } from '@/lib/mongo-transaction'
import { startBauCuaRound } from '@/lib/services/bau-cua/start-round'
import { placeBauCuaBet } from '@/lib/services/bau-cua/place-bet'
import { settleBauCuaRound } from '@/lib/services/bau-cua/settle-round'
import BauCuaRound from '@/lib/models/BauCuaRound'
import BauCuaBet from '@/lib/models/BauCuaBet'
import BauCuaWallet from '@/lib/models/BauCuaWallet'
import BauCuaSettlement from '@/lib/models/BauCuaSettlement'
import BauCuaFamilyState from '@/lib/models/BauCuaFamilyState'

const uri = getIntegrationMongoUri()
const requireRs = process.env.REQUIRE_MONGO_RS === 'true'
const describeIf = uri || requireRs ? describe : describe.skip

describeIf('Bau Cua production services (Mongo RS)', () => {
  const familyId = new mongoose.Types.ObjectId()
  const hostId = new mongoose.Types.ObjectId()
  const playerId = new mongoose.Types.ObjectId()

  beforeAll(async () => {
    if (!uri) {
      if (requireRs) throw new Error('MONGODB_URI required for RS integration')
      return
    }
    await connectIntegrationDb(uri)
    resetMongoTransactionCache()
    const rs = await isReplicaSetReady()
    if (!rs && requireRs) {
      throw new Error('Replica set PRIMARY required')
    }
  }, 30_000)

  afterAll(async () => {
    try {
      await dropIntegrationDb()
    } finally {
      await mongoose.disconnect().catch(() => undefined)
    }
  })

  it('two concurrent startBauCuaRound → ≤1 active round', async () => {
    await BauCuaFamilyState.deleteMany({ familyId })
    await BauCuaRound.deleteMany({ familyId })

    const results = await Promise.all([
      startBauCuaRound({ familyId: familyId.toString(), hostUserId: hostId.toString() }),
      startBauCuaRound({ familyId: familyId.toString(), hostUserId: hostId.toString() }),
      startBauCuaRound({ familyId: familyId.toString(), hostUserId: hostId.toString() }),
    ])

    const active = await BauCuaRound.countDocuments({
      familyId,
      status: { $in: ['betting', 'rolling'] },
    })
    expect(active).toBeLessThanOrEqual(1)
    expect(results.every((r) => r.round)).toBe(true)
    const ids = new Set(results.map((r) => r.round._id.toString()))
    expect(ids.size).toBe(1)

    const state = await BauCuaFamilyState.findOne({ familyId })
    expect(state?.status).toBe('betting')
    expect(state?.activeRoundId?.toString()).toBe(results[0].round._id.toString())
  })

  it('placeBauCuaBet respects balance under concurrency', async () => {
    await BauCuaBet.deleteMany({ familyId })
    await BauCuaWallet.deleteMany({ familyId })

    const start = await startBauCuaRound({
      familyId: familyId.toString(),
      hostUserId: hostId.toString(),
    })

    const results = await Promise.allSettled(
      Array.from({ length: 20 }, (_, i) =>
        placeBauCuaBet({
          familyId: familyId.toString(),
          userId: playerId.toString(),
          item: 'bau',
          amount: 100,
          idempotencyKey: `svc-par-${i}`,
        })
      )
    )

    const ok = results.filter((r) => r.status === 'fulfilled').length
    expect(ok).toBeLessThanOrEqual(10)
    expect(ok).toBeGreaterThan(0)

    const wallet = await BauCuaWallet.findOne({
      familyId,
      userId: playerId,
    })
    expect(wallet!.reservedBalance).toBe(ok * 100)
    expect(wallet!.reservedBalance).toBeLessThanOrEqual(1000)

    const bets = await BauCuaBet.countDocuments({ roundId: start.round._id })
    expect(bets).toBe(ok)
  })

  it('settleBauCuaRound is single-settlement under concurrent calls', async () => {
    // Ensure betting state with host
    let state = await BauCuaFamilyState.findOne({ familyId })
    let round = state?.activeRoundId
      ? await BauCuaRound.findById(state.activeRoundId)
      : null
    if (!round || round.status !== 'betting') {
      const s = await startBauCuaRound({
        familyId: familyId.toString(),
        hostUserId: hostId.toString(),
      })
      round = s.round
    }

    const outcomes = await Promise.allSettled([
      settleBauCuaRound({
        familyId: familyId.toString(),
        userId: hostId.toString(),
        isAdmin: true,
      }),
      settleBauCuaRound({
        familyId: familyId.toString(),
        userId: hostId.toString(),
        isAdmin: true,
      }),
    ])

    const fulfilled = outcomes.filter((o) => o.status === 'fulfilled')
    expect(fulfilled.length).toBeGreaterThanOrEqual(1)

    const settlements = await BauCuaSettlement.countDocuments({
      roundId: round!._id,
    })
    expect(settlements).toBeLessThanOrEqual(1)

    const stateAfter = await BauCuaFamilyState.findOne({ familyId })
    expect(['idle', 'rolling', 'betting']).toContain(stateAfter?.status)
    if (settlements === 1) {
      expect(stateAfter?.status).toBe('idle')
      expect(stateAfter?.activeRoundId).toBeNull()
    }
  })

  it('duplicate idempotency does not double-reserve via placeBauCuaBet', async () => {
    await BauCuaBet.deleteMany({ familyId, userId: playerId })
    await BauCuaWallet.deleteMany({ familyId, userId: playerId })
    await BauCuaFamilyState.findOneAndUpdate(
      { familyId },
      { $set: { status: 'idle', activeRoundId: null } }
    )
    await startBauCuaRound({
      familyId: familyId.toString(),
      hostUserId: hostId.toString(),
    })

    const a = await placeBauCuaBet({
      familyId: familyId.toString(),
      userId: playerId.toString(),
      item: 'cua',
      amount: 50,
      idempotencyKey: 'same-svc-key',
    })
    const b = await placeBauCuaBet({
      familyId: familyId.toString(),
      userId: playerId.toString(),
      item: 'cua',
      amount: 50,
      idempotencyKey: 'same-svc-key',
    })
    expect(a.idempotent).toBe(false)
    expect(b.idempotent).toBe(true)
    const wallet = await BauCuaWallet.findOne({ familyId, userId: playerId })
    expect(wallet?.reservedBalance).toBe(50)
  })
})
