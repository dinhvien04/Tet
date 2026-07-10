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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const familyIdRaw = body.familyId
    if (!familyIdRaw) {
      return NextResponse.json({ error: 'Thiếu familyId' }, { status: 400 })
    }

    const { user, membership, familyId } = await requireFamilyMember(String(familyIdRaw))
    await connectDB()

    // Authz BEFORE any state change
    const isAdmin = membership.role === 'admin'
    if (!isAdmin) {
      // Host check: only family admin for now (host is always admin who started)
      // Still allow if user is hostUserId of betting round
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
      const result = await withMongoTransaction(async (session) => {
        const opt = session ? { session } : {}

        const latestQ = BauCuaRound.findOne({ familyId }).sort({ roundNumber: -1 })
        if (session) latestQ.session(session)
        const latest = await latestQ

        if (latest?.status === 'rolled' && latest.settlementCompleted) {
          const settleQ = BauCuaSettlement.findOne({ roundId: latest._id })
          if (session) settleQ.session(session)
          const existingSettlement = await settleQ
          const walletQ = BauCuaWallet.findOne({ familyId, userId: user.id })
          if (session) walletQ.session(session)
          const wallet = await walletQ
          return {
            idempotent: true as const,
            round: latest,
            myBalance: wallet?.balance ?? 1000,
            settlement: existingSettlement,
            myNet: 0,
          }
        }

        const authFilter = isAdmin
          ? { familyId, status: 'betting' as const, settlementCompleted: false }
          : {
              familyId,
              status: 'betting' as const,
              settlementCompleted: false,
              hostUserId: user.id,
            }

        const round = await BauCuaRound.findOneAndUpdate(
          authFilter,
          { $set: { status: 'rolling' } },
          { sort: { roundNumber: -1 }, new: true, ...opt }
        )

        if (!round) {
          throw new AuthError('Không có ván nào đang mở để quay', 409)
        }

        const settleExistsQ = BauCuaSettlement.findOne({ roundId: round._id })
        if (session) settleExistsQ.session(session)
        const existingSettlement = await settleExistsQ
        if (existingSettlement) {
          return {
            idempotent: true as const,
            round,
            myBalance: 1000,
            settlement: existingSettlement,
            myNet: 0,
          }
        }

        const diceResults = rollDice()
        const betsQ = BauCuaBet.find({ roundId: round._id })
        if (session) betsQ.session(session)
        const bets = await betsQ

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

          const beforeQ = BauCuaWallet.findOne({ familyId, userId: uid })
          if (session) beforeQ.session(session)
          const before = await beforeQ
          const balanceBefore = before?.balance ?? 1000

          const after = await BauCuaWallet.findOneAndUpdate(
            { familyId, userId: uid },
            {
              $inc: { balance: net, reservedBalance: -reserved },
              $set: { updatedAt: now },
            },
            { new: true, ...opt }
          )

          if (after && after.reservedBalance < 0) {
            after.reservedBalance = 0
            await after.save(opt)
          }

          entries.push({
            userId: uid,
            reservedAmount: reserved,
            netDelta: net,
            balanceBefore,
            balanceAfter: after?.balance ?? balanceBefore + net,
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

        const myWalletQ = BauCuaWallet.findOne({ familyId, userId: user.id })
        if (session) myWalletQ.session(session)
        const myWallet = await myWalletQ

        return {
          idempotent: false as const,
          round,
          myBalance: myWallet?.balance ?? 1000,
          myNet: netByUser.get(user.id) || 0,
          payoutCount: netByUser.size,
        }
      })

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
      // Unique settlement race
      const e = error as { code?: number }
      if (e.code === 11000) {
        const latest = await BauCuaRound.findOne({ familyId }).sort({ roundNumber: -1 })
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
