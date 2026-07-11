import type { ClientSession } from 'mongoose'
import BauCuaRound from '@/lib/models/BauCuaRound'
import BauCuaFamilyState from '@/lib/models/BauCuaFamilyState'
import {
  TransactionNotSupportedError,
  withMongoTransaction,
} from '@/lib/mongo-transaction'
import { AuthError } from '@/lib/authorization'

const BETTING_WINDOW_MS = 60_000

export class BauCuaConflictError extends Error {
  status = 409
  constructor(message: string) {
    super(message)
    this.name = 'BauCuaConflictError'
  }
}

/**
 * Ensure family game state exists OUTSIDE any multi-doc transaction.
 * Safe concurrent upsert via unique familyId + duplicate-key ignore.
 */
export async function ensureBauCuaFamilyState(familyId: string): Promise<void> {
  const existing = await BauCuaFamilyState.findOne({ familyId })
  if (existing) return
  try {
    await BauCuaFamilyState.create({
      familyId,
      activeRoundId: null,
      status: 'idle',
      version: 0,
      betRevision: 0,
      updatedAt: new Date(),
    })
  } catch (err: unknown) {
    const e = err as { code?: number }
    if (e.code !== 11000) throw err
  }
}

export interface StartRoundResult {
  existing: boolean
  round: InstanceType<typeof BauCuaRound>
}

/**
 * Production start-round service (used by route + integration tests).
 */
export async function startBauCuaRound(options: {
  familyId: string
  hostUserId: string
}): Promise<StartRoundResult> {
  const { familyId, hostUserId } = options

  await ensureBauCuaFamilyState(familyId)

  try {
    return await withMongoTransaction(
      async (session) => {
        const opt = session ? { session } : {}

        const state = await BauCuaFamilyState.findOne({ familyId }, null, opt)
        if (!state) {
          throw new BauCuaConflictError('Trạng thái game chưa sẵn sàng')
        }

        if (
          state.status === 'betting' ||
          state.status === 'rolling' ||
          state.status === 'starting'
        ) {
          const active = state.activeRoundId
            ? await BauCuaRound.findById(state.activeRoundId, null, opt)
            : await BauCuaRound.findOne(
                { familyId, status: { $in: ['betting', 'rolling'] } },
                null,
                { ...opt, sort: { roundNumber: -1 } }
              )
          if (active) {
            return { existing: true as const, round: active }
          }
        }

        const claimed = await BauCuaFamilyState.findOneAndUpdate(
          {
            familyId,
            status: 'idle',
            version: state.version,
          },
          {
            $set: { status: 'starting', updatedAt: new Date() },
            $inc: { version: 1 },
          },
          { new: true, ...opt }
        )

        if (!claimed) {
          const current = await BauCuaFamilyState.findOne({ familyId }, null, opt)
          if (current?.activeRoundId) {
            const active = await BauCuaRound.findById(current.activeRoundId, null, opt)
            if (active) return { existing: true as const, round: active }
          }
          const open = await BauCuaRound.findOne(
            { familyId, status: { $in: ['betting', 'rolling'] } },
            null,
            { ...opt, sort: { roundNumber: -1 } }
          )
          if (open) return { existing: true as const, round: open }
          throw new BauCuaConflictError(
            'Không thể mở ván — trạng thái game đang thay đổi'
          )
        }

        const latestRound = await BauCuaRound.findOne({ familyId }, null, {
          ...opt,
          sort: { roundNumber: -1 },
        })
        const nextNumber = latestRound ? latestRound.roundNumber + 1 : 1
        const now = new Date()
        const expectedVersion = claimed.version

        const [newRound] = await BauCuaRound.create(
          [
            {
              familyId,
              roundNumber: nextNumber,
              status: 'betting',
              hostUserId,
              bettingClosesAt: new Date(now.getTime() + BETTING_WINDOW_MS),
              settlementCompleted: false,
              startedAt: now,
            },
          ],
          session ? { session } : undefined
        )

        // CAS starting → betting with expected version
        const activated = await BauCuaFamilyState.findOneAndUpdate(
          {
            familyId,
            status: 'starting',
            version: expectedVersion,
          },
          {
            $set: {
              activeRoundId: newRound._id,
              status: 'betting',
              updatedAt: now,
            },
            $inc: { version: 1 },
          },
          { new: true, ...opt }
        )

        if (!activated) {
          throw new BauCuaConflictError(
            'Không thể kích hoạt ván — xung đột trạng thái'
          )
        }

        return { existing: false as const, round: newRound }
      },
      { requireReplicaSet: true }
    )
  } catch (error) {
    if (error instanceof TransactionNotSupportedError) throw error
    if (error instanceof BauCuaConflictError || error instanceof AuthError) throw error
    const e = error as { code?: number }
    if (e.code === 11000) {
      // Outside TX: return existing open round if any
      const open = await BauCuaRound.findOne({
        familyId,
        status: { $in: ['betting', 'rolling'] },
      }).sort({ roundNumber: -1 })
      if (open) return { existing: true, round: open }
    }
    throw error
  }
}

/** Test helper type re-export */
export type { ClientSession }
