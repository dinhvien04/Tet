import { NextRequest, NextResponse } from 'next/server'
import { randomInt } from 'crypto'
import { connectDB } from '@/lib/mongodb'
import BauCuaRound, { BAU_CUA_ITEMS, BauCuaItem } from '@/lib/models/BauCuaRound'
import BauCuaBet from '@/lib/models/BauCuaBet'
import BauCuaWallet from '@/lib/models/BauCuaWallet'
import {
  AuthError,
  authErrorResponse,
  requireFamilyMember,
} from '@/lib/authorization'

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

    // CAS: only one concurrent roll can transition betting → rolling
    const round = await BauCuaRound.findOneAndUpdate(
      { familyId, status: 'betting', settlementCompleted: false },
      {
        $set: {
          status: 'rolling',
        },
      },
      { sort: { roundNumber: -1 }, new: true }
    )

    if (!round) {
      // Maybe already rolled — return idempotent result if host retries
      const latest = await BauCuaRound.findOne({ familyId }).sort({ roundNumber: -1 })
      if (latest?.status === 'rolled' && latest.settlementCompleted) {
        const wallet = await BauCuaWallet.findOne({ familyId, userId: user.id }).lean()
        return NextResponse.json({
          success: true,
          idempotent: true,
          round: {
            id: latest._id.toString(),
            roundNumber: latest.roundNumber,
            status: latest.status,
            diceResults: latest.diceResults,
            rolledAt: latest.rolledAt,
          },
          myBalance: wallet?.balance ?? 1000,
        })
      }

      return NextResponse.json(
        { error: 'Không có ván nào đang mở để quay' },
        { status: 409 }
      )
    }

    // Host or family admin only
    const isHost = round.hostUserId?.toString() === user.id
    const isAdmin = membership.role === 'admin'
    if (!isHost && !isAdmin) {
      // Revert status so a legitimate host can still roll
      await BauCuaRound.updateOne(
        { _id: round._id, status: 'rolling', settlementCompleted: false },
        { $set: { status: 'betting' } }
      )
      return NextResponse.json(
        { error: 'Chỉ host hoặc admin mới được quay' },
        { status: 403 }
      )
    }

    const diceResults = rollDice()
    const bets = await BauCuaBet.find({ roundId: round._id }).lean()

    // Net payout per user: win = +amount * matchCount, lose = -amount
    // Reserved was held; settlement applies net to balance and clears reserved.
    const netByUser = new Map<string, number>()
    const reservedByUser = new Map<string, number>()

    for (const bet of bets) {
      const userId = bet.userId.toString()
      const matchedCount = diceResults.filter((result) => result === bet.item).length
      const net = matchedCount === 0 ? -bet.amount : bet.amount * matchedCount
      netByUser.set(userId, (netByUser.get(userId) || 0) + net)
      reservedByUser.set(userId, (reservedByUser.get(userId) || 0) + bet.amount)
    }

    const now = new Date()
    const userIds = Array.from(
      new Set([...netByUser.keys(), ...reservedByUser.keys()])
    )

    if (userIds.length > 0) {
      // Ensure wallets exist before settlement
      for (const userId of userIds) {
        await BauCuaWallet.findOneAndUpdate(
          { familyId, userId },
          {
            $setOnInsert: {
              balance: 1000,
              reservedBalance: 0,
              updatedAt: now,
            },
          },
          { upsert: true }
        )
      }

      await BauCuaWallet.bulkWrite(
        userIds.map((userId) => {
          const net = netByUser.get(userId) || 0
          const reserved = reservedByUser.get(userId) || 0
          return {
            updateOne: {
              filter: { familyId, userId },
              update: {
                $inc: {
                  balance: net,
                  reservedBalance: -reserved,
                },
                $set: { updatedAt: now },
              },
            },
          }
        })
      )
    }

    // Mark settlement complete only once (idempotent)
    const settled = await BauCuaRound.findOneAndUpdate(
      {
        _id: round._id,
        status: 'rolling',
        settlementCompleted: false,
      },
      {
        $set: {
          status: 'rolled',
          diceResults,
          rolledAt: now,
          settlementCompleted: true,
        },
      },
      { new: true }
    )

    if (!settled) {
      // Another process finished settlement; do not apply twice
      const latest = await BauCuaRound.findById(round._id)
      const wallet = await BauCuaWallet.findOne({ familyId, userId: user.id }).lean()
      return NextResponse.json({
        success: true,
        idempotent: true,
        round: {
          id: latest?._id.toString(),
          roundNumber: latest?.roundNumber,
          status: latest?.status,
          diceResults: latest?.diceResults,
          rolledAt: latest?.rolledAt,
        },
        myBalance: wallet?.balance ?? 1000,
      })
    }

    // Clamp reservedBalance >= 0 (in case of drift)
    await BauCuaWallet.updateMany(
      { familyId, reservedBalance: { $lt: 0 } },
      { $set: { reservedBalance: 0 } }
    )

    const updatedWallet = await BauCuaWallet.findOne({
      familyId,
      userId: user.id,
    }).lean()

    return NextResponse.json({
      success: true,
      round: {
        id: settled._id.toString(),
        roundNumber: settled.roundNumber,
        status: settled.status,
        diceResults: settled.diceResults,
        rolledAt: settled.rolledAt,
      },
      myNet: netByUser.get(user.id) || 0,
      myBalance: updatedWallet?.balance ?? 1000,
      payoutCount: userIds.length,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error rolling Bau Cua round:', error)
    return NextResponse.json({ error: 'Không thể quay xúc xắc' }, { status: 500 })
  }
}
