import { NextRequest, NextResponse } from 'next/server'
import { randomInt } from 'crypto'
import { connectDB } from '@/lib/mongodb'
import BauCuaRound, { BAU_CUA_ITEMS, BauCuaItem } from '@/lib/models/BauCuaRound'
import BauCuaBet from '@/lib/models/BauCuaBet'
import BauCuaWallet from '@/lib/models/BauCuaWallet'
import BauCuaSettlement from '@/lib/models/BauCuaSettlement'
import BauCuaFamilyState from '@/lib/models/BauCuaFamilyState'
import {
  AuthError,
  authErrorResponse,
  requireFamilyMember,
} from '@/lib/authorization'
import {
  TransactionNotSupportedError,
  withMongoTransaction,
} from '@/lib/mongo-transaction'

function rollDice(): BauCuaItem[] {
  return Array.from({ length: 3 }, () => {
    const index = randomInt(0, BAU_CUA_ITEMS.length)
    return BAU_CUA_ITEMS[index]
  })
}

class InvariantDriftError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvariantDriftError'
  }
}

function myNetFromSettlement(
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
  session?: import('mongoose').ClientSession
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const familyIdRaw = body.familyId
    if (!familyIdRaw) {
      return NextResponse.json({ error: 'Thiếu familyId' }, { status: 400 })
    }

    const { user, membership, familyId } = await requireFamilyMember(String(familyIdRaw))
    await connectDB()

    const isAdmin = membership.role === 'admin'
    if (!isAdmin) {
      const open = await BauCuaRound.findOne({ familyId, status: 'betting' }).sort({
        roundNumber: -1,
      })
      const isHost = open?.hostUserId?.toString() === user.id
      if (!isHost) {
        return NextResponse.json(
          { error: 'Chỉ host hoặc admin mới được quay' },
          { status: 403 }
        )
      }
    }

    try {
      const result = await withMongoTransaction(
        async (session) => {
          const opt = session ? { session } : {}

          // Idempotent: already settled latest round — repair state if needed
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
              await repairSettlementState(familyId.toString(), latest, existingSettlement, session)
              const wallet = await BauCuaWallet.findOne(
                { familyId, userId: user.id },
                null,
                opt
              )
              return {
                idempotent: true as const,
                round: latest,
                myBalance: wallet?.balance ?? 1000,
                settlement: existingSettlement,
                myNet: myNetFromSettlement(existingSettlement, user.id),
              }
            }
          }

          // CAS family state betting → rolling (write-conflicts with BET's betRevision lock)
          const hostFilter = isAdmin
            ? {}
            : { hostUserId: user.id }

          // First claim the family state lock
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
            // Maybe settlement already exists — recovery path
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
                  familyId.toString(),
                  settleLatest,
                  existingSettlement,
                  session
                )
                const wallet = await BauCuaWallet.findOne(
                  { familyId, userId: user.id },
                  null,
                  opt
                )
                return {
                  idempotent: true as const,
                  round: settleLatest,
                  myBalance: wallet?.balance ?? 1000,
                  settlement: existingSettlement,
                  myNet: myNetFromSettlement(existingSettlement, user.id),
                }
              }
            }
            throw new AuthError('Không có ván nào đang mở để quay', 409)
          }

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
            // Host mismatch or race
            const existingSettlement = await BauCuaSettlement.findOne(
              { roundId: state.activeRoundId },
              null,
              opt
            )
            if (existingSettlement) {
              const r = await BauCuaRound.findById(state.activeRoundId, null, opt)
              if (r) {
                await repairSettlementState(familyId.toString(), r, existingSettlement, session)
              }
              const wallet = await BauCuaWallet.findOne(
                { familyId, userId: user.id },
                null,
                opt
              )
              return {
                idempotent: true as const,
                round: r || latest!,
                myBalance: wallet?.balance ?? 1000,
                settlement: existingSettlement,
                myNet: myNetFromSettlement(existingSettlement, user.id),
              }
            }
            throw new AuthError('Không có ván nào đang mở để quay', 409)
          }

          const existingSettlement = await BauCuaSettlement.findOne(
            { roundId: round._id },
            null,
            opt
          )
          if (existingSettlement) {
            await repairSettlementState(familyId.toString(), round, existingSettlement, session)
            const wallet = await BauCuaWallet.findOne(
              { familyId, userId: user.id },
              null,
              opt
            )
            return {
              idempotent: true as const,
              round,
              myBalance: wallet?.balance ?? 1000,
              settlement: existingSettlement,
              myNet: myNetFromSettlement(existingSettlement, user.id),
            }
          }

          // Snapshot bets AFTER claiming rolling lock (BET concurrent must conflict)
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

            // Conditional update: reservedBalance must cover expected reserve
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
            { familyId, userId: user.id },
            null,
            opt
          )

          return {
            idempotent: false as const,
            round,
            myBalance: myWallet?.balance ?? 1000,
            myNet: netByUser.get(user.id) || 0,
            payoutCount: netByUser.size,
          }
        },
        { requireReplicaSet: true }
      )

      return NextResponse.json({
        success: true,
        idempotent: result.idempotent,
        round: {
          id: result.round._id.toString(),
          roundNumber: result.round.roundNumber,
          status: result.round.status,
          diceResults: result.round.diceResults,
          rolledAt: result.round.rolledAt,
        },
        myNet: result.myNet,
        myBalance: result.myBalance,
        payoutCount: 'payoutCount' in result ? result.payoutCount : 0,
      })
    } catch (error) {
      if (error instanceof AuthError) {
        const { error: message, status } = authErrorResponse(error)
        return NextResponse.json({ error: message }, { status })
      }
      if (error instanceof TransactionNotSupportedError) {
        return NextResponse.json(
          {
            error:
              'Máy chủ game cần MongoDB replica set (transaction). Cấu hình Atlas/replica set.',
          },
          { status: 503 }
        )
      }
      if (error instanceof InvariantDriftError) {
        console.error('[bau-cua] invariant drift', error.message)
        return NextResponse.json(
          { error: 'Lỗi đồng bộ điểm. Ván chưa được chốt — thử lại hoặc liên hệ admin.' },
          { status: 409 }
        )
      }
      // Unique settlement race — recover with correct myNet
      const e = error as { code?: number }
      if (e.code === 11000) {
        const latest = await BauCuaRound.findOne({ familyId }).sort({ roundNumber: -1 })
        const settlement = latest
          ? await BauCuaSettlement.findOne({ roundId: latest._id })
          : null
        if (latest && settlement) {
          await withMongoTransaction(
            async (session) => {
              await repairSettlementState(
                familyId.toString(),
                latest,
                settlement,
                session
              )
            },
            { requireReplicaSet: true }
          ).catch(() => undefined)
        }
        const wallet = await BauCuaWallet.findOne({ familyId, userId: user.id })
        return NextResponse.json({
          success: true,
          idempotent: true,
          round: latest
            ? {
                id: latest._id.toString(),
                roundNumber: latest.roundNumber,
                status: latest.status,
                diceResults: latest.diceResults,
                rolledAt: latest.rolledAt,
              }
            : null,
          myNet: myNetFromSettlement(settlement, user.id),
          myBalance: wallet?.balance ?? 1000,
        })
      }
      throw error
    }
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error rolling Bau Cua round:', error)
    return NextResponse.json({ error: 'Không thể quay xúc xắc' }, { status: 500 })
  }
}
