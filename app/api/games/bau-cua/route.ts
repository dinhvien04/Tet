import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import FamilyMember from '@/lib/models/FamilyMember'
import BauCuaRound, { BAU_CUA_ITEMS, BauCuaItem } from '@/lib/models/BauCuaRound'
import BauCuaBet from '@/lib/models/BauCuaBet'
import BauCuaWallet from '@/lib/models/BauCuaWallet'

function createEmptySummary() {
  return BAU_CUA_ITEMS.reduce<Record<BauCuaItem, number>>((acc, item) => {
    acc[item] = 0
    return acc
  }, {} as Record<BauCuaItem, number>)
}

function calculateNet(
  bets: Array<{ item: BauCuaItem; amount: number }>,
  diceResults: BauCuaItem[]
) {
  return bets.reduce((sum, bet) => {
    const matchedCount = diceResults.filter((result) => result === bet.item).length
    const net = matchedCount === 0 ? -bet.amount : bet.amount * matchedCount
    return sum + net
  }, 0)
}

function getStartOfWeek(date: Date) {
  const start = new Date(date)
  const day = start.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + diffToMonday)
  start.setHours(0, 0, 0, 0)
  return start
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
    const myBets: Array<{ id: string; item: BauCuaItem; amount: number }> = []
    let myTotalBet = 0

    if (latestRound) {
      const bets = await BauCuaBet.find({ roundId: latestRound._id }).lean()

      bets.forEach((bet) => {
        betsSummary[bet.item as BauCuaItem] = (betsSummary[bet.item as BauCuaItem] || 0) + bet.amount
        if (bet.userId.toString() === session.user.id) {
          myBets.push({
            id: bet._id.toString(),
            item: bet.item as BauCuaItem,
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

    const rolledRounds = await BauCuaRound.find({ familyId, status: 'rolled' })
      .sort({ roundNumber: -1 })
      .limit(12)
      .lean()

    const roundHistory: Array<{
      round_id: string
      round_number: number
      dice_results: BauCuaItem[]
      rolled_at: Date | null
      total_bet: number
      my_total_bet: number
      my_net: number
    }> = []

    if (rolledRounds.length > 0) {
      const historyRoundIds = rolledRounds.map((round) => round._id)
      const historyBets = await BauCuaBet.find({ roundId: { $in: historyRoundIds } })
        .select('roundId userId item amount')
        .lean()

      const totalByRound = new Map<string, number>()
      const myBetsByRound = new Map<string, Array<{ item: BauCuaItem; amount: number }>>()

      historyBets.forEach((bet) => {
        const roundId = bet.roundId.toString()
        totalByRound.set(roundId, (totalByRound.get(roundId) || 0) + bet.amount)

        if (bet.userId.toString() === session.user.id) {
          const current = myBetsByRound.get(roundId) || []
          current.push({ item: bet.item as BauCuaItem, amount: bet.amount })
          myBetsByRound.set(roundId, current)
        }
      })

      rolledRounds.forEach((round) => {
        const roundId = round._id.toString()
        const results = (round.diceResults || []) as BauCuaItem[]
        const myRoundBets = myBetsByRound.get(roundId) || []
        const myRoundTotal = myRoundBets.reduce((sum, bet) => sum + bet.amount, 0)

        roundHistory.push({
          round_id: roundId,
          round_number: round.roundNumber,
          dice_results: results,
          rolled_at: round.rolledAt || null,
          total_bet: totalByRound.get(roundId) || 0,
          my_total_bet: myRoundTotal,
          my_net: calculateNet(myRoundBets, results),
        })
      })
    }

    const now = new Date()
    const weekStart = getStartOfWeek(now)
    const weeklyRounds = await BauCuaRound.find({
      familyId,
      status: 'rolled',
      rolledAt: { $gte: weekStart, $lte: now },
    })
      .select('_id diceResults')
      .lean()

    let weeklyRoundsPlayed = 0
    let weeklyWins = 0
    let weeklyLosses = 0
    let weeklyDraws = 0
    let weeklyTotalBet = 0
    let weeklyTotalNet = 0

    if (weeklyRounds.length > 0) {
      const weeklyRoundIds = weeklyRounds.map((round) => round._id)
      const myWeeklyBets = await BauCuaBet.find({
        roundId: { $in: weeklyRoundIds },
        userId: session.user.id,
      })
        .select('roundId item amount')
        .lean()

      const myWeeklyBetsByRound = new Map<string, Array<{ item: BauCuaItem; amount: number }>>()

      myWeeklyBets.forEach((bet) => {
        const roundId = bet.roundId.toString()
        const current = myWeeklyBetsByRound.get(roundId) || []
        current.push({ item: bet.item as BauCuaItem, amount: bet.amount })
        myWeeklyBetsByRound.set(roundId, current)
      })

      weeklyRounds.forEach((round) => {
        const roundId = round._id.toString()
        const bets = myWeeklyBetsByRound.get(roundId) || []
        if (bets.length === 0) {
          return
        }

        const results = (round.diceResults || []) as BauCuaItem[]
        const roundTotalBet = bets.reduce((sum, bet) => sum + bet.amount, 0)
        const roundNet = calculateNet(bets, results)

        weeklyRoundsPlayed += 1
        weeklyTotalBet += roundTotalBet
        weeklyTotalNet += roundNet

        if (roundNet > 0) weeklyWins += 1
        else if (roundNet < 0) weeklyLosses += 1
        else weeklyDraws += 1
      })
    }

    const weeklyWinRate = weeklyRoundsPlayed > 0 ? Math.round((weeklyWins / weeklyRoundsPlayed) * 100) : 0

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
            dice_results: (latestRound.diceResults || []) as BauCuaItem[],
            started_at: latestRound.startedAt,
            rolled_at: latestRound.rolledAt || null,
          }
        : null,
      bets_summary: betsSummary,
      my_bets: myBets,
      my_total_bet: myTotalBet,
      leaderboard,
      round_history: roundHistory,
      weekly_stats: {
        week_start: weekStart.toISOString(),
        week_end: now.toISOString(),
        rounds_played: weeklyRoundsPlayed,
        wins: weeklyWins,
        losses: weeklyLosses,
        draws: weeklyDraws,
        total_bet: weeklyTotalBet,
        total_net: weeklyTotalNet,
        win_rate: weeklyWinRate,
      },
      items: BAU_CUA_ITEMS,
    })
  } catch (error) {
    console.error('Error getting Bau Cua state:', error)
    return NextResponse.json({ error: 'Khong the lay trang thai game' }, { status: 500 })
  }
}
