import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import FamilyMember from '@/lib/models/FamilyMember'
import BauCuaRound, { BAU_CUA_ITEMS } from '@/lib/models/BauCuaRound'
import BauCuaBet from '@/lib/models/BauCuaBet'
import BauCuaWallet from '@/lib/models/BauCuaWallet'

function createEmptySummary() {
  return BAU_CUA_ITEMS.reduce<Record<string, number>>((acc, item) => {
    acc[item] = 0
    return acc
  }, {})
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Vui long dang nhap' }, { status: 401 })
    }

    const familyId = request.nextUrl.searchParams.get('familyId')
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

    const wallet =
      (await BauCuaWallet.findOne({ familyId, userId: session.user.id }).lean()) ||
      (await BauCuaWallet.create({ familyId, userId: session.user.id, balance: 1000 }))

    const latestRound = await BauCuaRound.findOne({ familyId }).sort({ roundNumber: -1 }).lean()

    const betsSummary = createEmptySummary()
    const myBets: Array<{ id: string; item: string; amount: number }> = []
    let myTotalBet = 0

    if (latestRound) {
      const bets = await BauCuaBet.find({ roundId: latestRound._id }).lean()

      bets.forEach((bet) => {
        betsSummary[bet.item] = (betsSummary[bet.item] || 0) + bet.amount
        if (bet.userId.toString() === session.user.id) {
          myBets.push({
            id: bet._id.toString(),
            item: bet.item,
            amount: bet.amount,
          })
          myTotalBet += bet.amount
        }
      })
    }

    const leaderboardWallets = await BauCuaWallet.find({ familyId })
      .populate('userId', 'name avatar')
      .sort({ balance: -1 })
      .limit(10)
      .lean()

    const leaderboard = leaderboardWallets.map((entry) => {
      const user = entry.userId as unknown as {
        _id: { toString(): string }
        name: string
        avatar?: string | null
      }

      return {
        user_id: user._id.toString(),
        name: user.name,
        avatar: user.avatar ?? null,
        balance: entry.balance,
      }
    })

    return NextResponse.json({
      wallet: {
        balance: wallet.balance,
        available_balance: Math.max(0, wallet.balance - myTotalBet),
      },
      round: latestRound
        ? {
            id: latestRound._id.toString(),
            round_number: latestRound.roundNumber,
            status: latestRound.status,
            dice_results: latestRound.diceResults || [],
            started_at: latestRound.startedAt,
            rolled_at: latestRound.rolledAt || null,
          }
        : null,
      bets_summary: betsSummary,
      my_bets: myBets,
      my_total_bet: myTotalBet,
      leaderboard,
      items: BAU_CUA_ITEMS,
    })
  } catch (error) {
    console.error('Error getting Bau Cua state:', error)
    return NextResponse.json({ error: 'Khong the lay trang thai game' }, { status: 500 })
  }
}
