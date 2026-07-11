import { randomInt } from 'crypto'
import type { ClientSession } from 'mongoose'
import BauCuaRound, { BAU_CUA_ITEMS, BauCuaItem } from '@/lib/models/BauCuaRound'
import BauCuaBet from '@/lib/models/BauCuaBet'
import BauCuaWallet from '@/lib/models/BauCuaWallet'
import BauCuaSettlement from '@/lib/models/BauCuaSettlement'
import BauCuaFamilyState from '@/lib/models/BauCuaFamilyState'
import {
  TransactionNotSupportedError,
  withMongoTransaction,
} from '@/lib/mongo-transaction'
import { AuthError } from '@/lib/authorization'
import { ensureBauCuaFamilyState } from './start-round'

function rollDice(): BauCuaItem[] {
  return Array.from({ length: 3 }, () => {
    const index = randomInt(0, BAU_CUA_ITEMS.length)
    return BAU_CUA_ITEMS[index]
  })
}

export class InvariantDriftError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvariantDriftError'
  }
}

export function myNetFromSettlement(
  settlement: { entries?: Array<{ userId: unknown; netDelta: number }> } | null | undefined,
  userId: string
): number {
  if (!settlement?.entries) return 0
  const entry = settlement.entries.find((e) => e.userId?.toString() === userId)
  return entry?.netDelta ?? 0
}

async function repairSettlementState(
  familyId: string,
  round: InstanceType<typeof BauCuaRound>,
  settlement: InstanceType<typeof BauCuaSettlement>,
  session?: ClientSession
) {
  const opt = session ? { session } : {}
  const now = new Date()

  if (round.status !== 'rolled' || !round.settlementCompleted) {
    round.status = 'rolled'
    round.diceResults = settlement.diceResults
    round.rolledAt = round.rolledAt || settlement.completedAt || now
    round.settlementCompleted = true
    await round.save(opt)
  }

  await BauCuaFamilyState.findOneAndUpdate(
    { familyId },
    {
      $set: {
        activeRoundId: null,
        status: 'idle',
        updatedAt: now,
      },
      $inc: { version: 1 },
    },
    { upsert: true, ...opt }
  )
}

export interface SettleRoundInput {
  familyId: string
  userId: string
  isAdmin: boolean
}

export interface SettleRoundResult {
  idempotent: boolean
  round: InstanceType<typeof BauCuaRound>
  myBalance: number
  myNet: number
  payoutCount?: number
}

export async function settleBauCuaRound(
  input: SettleRoundInput
): Promise<SettleRoundResult> {
  const { familyId, userId, isAdmin } = input
  await ensureBauCuaFamilyState(familyId)

  try {
    return await withMongoTransaction(
      async (session) => {
        const opt = session ? { session } : {}

        const latest = await BauCuaRound.findOne({ familyId }, null, {
          ...opt,
          sort: { roundNumber: -1 },
        })

        if (latest?.status === 'rolled' && latest.settlementCompleted) {
          const existingSettlement = await BauCuaSettlement.findOne(
            { roundId: latest._id },
            null,
            opt
          )
          if (existingSettlement) {
            await repairSettlementState(
              familyId,
              latest,
              existingSettlement,
              session
            )
            const wallet = await BauCuaWallet.findOne(
              { familyId, userId },
              null,
              opt
            )
            return {
              idempotent: true as const,
              round: latest,
              myBalance: wallet?.balance ?? 1000,
              myNet: myNetFromSettlement(existingSettlement, userId),
            }
          }
        }

        const state = await BauCuaFamilyState.findOneAndUpdate(
          {
            familyId,
            status: 'betting',
            activeRoundId: { $ne: null },
          },
          {
            $set: { status: 'rolling', updatedAt: new Date() },
            $inc: { version: 1 },
          },
          { new: true, ...opt }
        )

        if (!state?.activeRoundId) {
          const settleLatest = await BauCuaRound.findOne({ familyId }, null, {
            ...opt,
            sort: { roundNumber: -1 },
          })
          if (settleLatest) {
            const existingSettlement = await BauCuaSettlement.findOne(
              { roundId: settleLatest._id },
              null,
              opt
            )
            if (existingSettlement) {
              await repairSettlementState(
                familyId,
                settleLatest,
                existingSettlement,
                session
              )
              const wallet = await BauCuaWallet.findOne(
                { familyId, userId },
                null,
                opt
              )
              return {
                idempotent: true as const,
                round: settleLatest,
                myBalance: wallet?.balance ?? 1000,
                myNet: myNetFromSettlement(existingSettlement, userId),
              }
            }
          }
          throw new AuthError('Không có ván nào đang mở để quay', 409)
        }

        const hostFilter = isAdmin ? {} : { hostUserId: userId }
        const round = await BauCuaRound.findOneAndUpdate(
          {
            _id: state.activeRoundId,
            familyId,
            status: 'betting',
            settlementCompleted: false,
            ...hostFilter,
          },
          { $set: { status: 'rolling' } },
          { new: true, ...opt }
        )

        if (!round) {
          throw new AuthError('Không có ván nào đang mở để quay', 409)
        }

        const existingSettlement = await BauCuaSettlement.findOne(
          { roundId: round._id },
          null,
          opt
        )
        if (existingSettlement) {
          await repairSettlementState(familyId, round, existingSettlement, session)
          const wallet = await BauCuaWallet.findOne(
            { familyId, userId },
            null,
            opt
          )
          return {
            idempotent: true as const,
            round,
            myBalance: wallet?.balance ?? 1000,
            myNet: myNetFromSettlement(existingSettlement, userId),
          }
        }

        const diceResults = rollDice()
        const bets = await BauCuaBet.find({ roundId: round._id }, null, opt)

        const netByUser = new Map<string, number>()
        const reservedByUser = new Map<string, number>()
        for (const bet of bets) {
          const uid = bet.userId.toString()
          const matched = diceResults.filter((d) => d === bet.item).length
          const net = matched === 0 ? -bet.amount : bet.amount * matched
          netByUser.set(uid, (netByUser.get(uid) || 0) + net)
          reservedByUser.set(uid, (reservedByUser.get(uid) || 0) + bet.amount)
        }

        const now = new Date()
        const entries: Array<{
          userId: string
          reservedAmount: number
          netDelta: number
          balanceBefore: number
          balanceAfter: number
        }> = []

        for (const [uid, net] of netByUser) {
          const reserved = reservedByUser.get(uid) || 0
          await BauCuaWallet.findOneAndUpdate(
            { familyId, userId: uid },
            {
              $setOnInsert: {
                balance: 1000,
                reservedBalance: 0,
                updatedAt: now,
              },
            },
            { upsert: true, ...opt }
          )

          const before = await BauCuaWallet.findOne(
            { familyId, userId: uid },
            null,
            opt
          )
          const balanceBefore = before?.balance ?? 1000

          const after = await BauCuaWallet.findOneAndUpdate(
            {
              familyId,
              userId: uid,
              reservedBalance: { $gte: reserved },
            },
            {
              $inc: { balance: net, reservedBalance: -reserved },
              $set: { updatedAt: now },
            },
            { new: true, ...opt }
          )

          if (!after) {
            throw new InvariantDriftError(
              `Wallet invariant drift for user ${uid}: reservedBalance < ${reserved}`
            )
          }

          entries.push({
            userId: uid,
            reservedAmount: reserved,
            netDelta: net,
            balanceBefore,
            balanceAfter: after.balance,
          })
        }

        await BauCuaSettlement.create(
          [
            {
              roundId: round._id,
              familyId,
              diceResults,
              entries: entries.map((e) => ({
                userId: e.userId,
                reservedAmount: e.reservedAmount,
                netDelta: e.netDelta,
                balanceBefore: e.balanceBefore,
                balanceAfter: e.balanceAfter,
              })),
              status: 'completed',
              createdAt: now,
              completedAt: now,
            },
          ],
          session ? { session } : undefined
        )

        round.status = 'rolled'
        round.diceResults = diceResults
        round.rolledAt = now
        round.settlementCompleted = true
        await round.save(opt)

        await BauCuaFamilyState.findOneAndUpdate(
          { familyId },
          {
            $set: {
              activeRoundId: null,
              status: 'idle',
              updatedAt: now,
            },
            $inc: { version: 1 },
          },
          { upsert: true, ...opt }
        )

        const myWallet = await BauCuaWallet.findOne(
          { familyId, userId },
          null,
          opt
        )

        return {
          idempotent: false as const,
          round,
          myBalance: myWallet?.balance ?? 1000,
          myNet: netByUser.get(userId) || 0,
          payoutCount: netByUser.size,
        }
      },
      { requireReplicaSet: true }
    )
  } catch (error) {
    if (
      error instanceof AuthError ||
      error instanceof TransactionNotSupportedError ||
      error instanceof InvariantDriftError
    ) {
      throw error
    }
    const e = error as { code?: number }
    if (e.code === 11000) {
      const latest = await BauCuaRound.findOne({ familyId }).sort({
        roundNumber: -1,
      })
      const settlement = latest
        ? await BauCuaSettlement.findOne({ roundId: latest._id })
        : null
      if (latest && settlement) {
        await withMongoTransaction(
          async (session) => {
            await repairSettlementState(
              familyId,
              latest,
              settlement,
              session
            )
          },
          { requireReplicaSet: true }
        ).catch(() => undefined)
        const wallet = await BauCuaWallet.findOne({ familyId, userId })
        return {
          idempotent: true,
          round: latest,
          myBalance: wallet?.balance ?? 1000,
          myNet: myNetFromSettlement(settlement, userId),
        }
      }
    }
    throw error
  }
}
