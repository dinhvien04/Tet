import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import FamilyMember from '@/lib/models/FamilyMember'
import BauCuaRound, { BAU_CUA_ITEMS, BauCuaItem } from '@/lib/models/BauCuaRound'
import BauCuaBet from '@/lib/models/BauCuaBet'
import BauCuaWallet from '@/lib/models/BauCuaWallet'

function rollDice(): BauCuaItem[] {
  return Array.from({ length: 3 }, () => {
    const index = Math.floor(Math.random() * BAU_CUA_ITEMS.length)
    return BAU_CUA_ITEMS[index]
  })
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Vui long dang nhap' }, { status: 401 })
    }

    const body = await request.json()
    const familyId = body.familyId
    if (!familyId) {
      return NextResponse.json({ error: 'Thieu familyId' }, { status: 400 })
    }

    await connectDB()

    const membership = await FamilyMember.findOne({
      familyId,
      userId: session.user.id,
    }).lean()
    if (!membership) {
      return NextResponse.json(
        { error: 'Ban khong phai thanh vien cua nha nay' },
        { status: 403 }
      )
    }

    const round = await BauCuaRound.findOneAndUpdate(
      { familyId, status: 'betting' },
      { status: 'rolling' },
      { sort: { roundNumber: -1 }, new: true }
    )

    if (!round) {
      return NextResponse.json(
        { error: 'Khong co van nao dang mo de quay' },
        { status: 409 }
      )
    }

    const diceResults = rollDice()
    const bets = await BauCuaBet.find({ roundId: round._id }).lean()
    const payouts = new Map<string, number>()

    bets.forEach((bet) => {
      const userId = bet.userId.toString()
      const matchedCount = diceResults.filter((result) => result === bet.item).length
      const net = matchedCount === 0 ? -bet.amount : bet.amount * matchedCount
      payouts.set(userId, (payouts.get(userId) || 0) + net)
    })

    const now = new Date()
    const payoutUserIds = Array.from(payouts.keys())
    if (payoutUserIds.length > 0) {
      const existingWallets = await BauCuaWallet.find({
        familyId,
        userId: { $in: payoutUserIds },
      })
        .select('userId')
        .lean()

      const existingSet = new Set(existingWallets.map((wallet) => wallet.userId.toString()))
      const missingUserIds = payoutUserIds.filter((userId) => !existingSet.has(userId))

      if (missingUserIds.length > 0) {
        await BauCuaWallet.insertMany(
          missingUserIds.map((userId) => ({
            familyId,
            userId,
            balance: 1000,
            updatedAt: now,
          }))
        )
      }

      await BauCuaWallet.bulkWrite(
        payoutUserIds.map((userId) => ({
          updateOne: {
            filter: { familyId, userId },
            update: {
              $inc: { balance: payouts.get(userId) || 0 },
              $set: { updatedAt: now },
            },
          },
        }))
      )
    }

    round.status = 'rolled'
    round.diceResults = diceResults
    round.rolledAt = now
    await round.save()

    const updatedWallet =
      (await BauCuaWallet.findOne({ familyId, userId: session.user.id }).lean()) ||
      ({ balance: 1000 } as { balance: number })

    return NextResponse.json({
      success: true,
      round: {
        id: round._id.toString(),
        round_number: round.roundNumber,
        status: round.status,
        dice_results: round.diceResults,
        rolled_at: round.rolledAt,
      },
      my_net: payouts.get(session.user.id) || 0,
      my_balance: updatedWallet.balance,
      payout_count: payoutUserIds.length,
    })
  } catch (error) {
    console.error('Error rolling Bau Cua round:', error)
    return NextResponse.json({ error: 'Khong the quay xuc xac' }, { status: 500 })
  }
}
