import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import FamilyMember from '@/lib/models/FamilyMember'
import BauCuaRound, { BAU_CUA_ITEMS } from '@/lib/models/BauCuaRound'
import BauCuaBet from '@/lib/models/BauCuaBet'
import BauCuaWallet from '@/lib/models/BauCuaWallet'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Vui long dang nhap' }, { status: 401 })
    }

    const body = await request.json()
    const familyId = body.familyId
    const item = body.item
    const amount = Number(body.amount)

    if (!familyId || !item || Number.isNaN(amount)) {
      return NextResponse.json({ error: 'Thieu du lieu dat cuoc' }, { status: 400 })
    }

    if (!BAU_CUA_ITEMS.includes(item)) {
      return NextResponse.json({ error: 'Cua dat cuoc khong hop le' }, { status: 400 })
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: 'So diem dat cuoc phai la so nguyen duong' }, { status: 400 })
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

    const round = await BauCuaRound.findOne({ familyId, status: 'betting' }).sort({ roundNumber: -1 })
    if (!round) {
      return NextResponse.json({ error: 'Chua co van dang mo de dat cuoc' }, { status: 409 })
    }

    const wallet =
      (await BauCuaWallet.findOne({ familyId, userId: session.user.id })) ||
      (await BauCuaWallet.create({ familyId, userId: session.user.id, balance: 1000 }))

    const myBets = await BauCuaBet.find({
      roundId: round._id,
      userId: session.user.id,
    }).lean()

    const totalBet = myBets.reduce((sum, bet) => sum + bet.amount, 0)
    if (totalBet + amount > wallet.balance) {
      return NextResponse.json(
        { error: 'Khong du diem kha dung de dat cuoc' },
        { status: 400 }
      )
    }

    const createdBet = await BauCuaBet.create({
      roundId: round._id,
      familyId,
      userId: session.user.id,
      item,
      amount,
      createdAt: new Date(),
    })

    const newTotal = totalBet + amount

    return NextResponse.json({
      success: true,
      bet: {
        id: createdBet._id.toString(),
        item: createdBet.item,
        amount: createdBet.amount,
      },
      wallet: {
        balance: wallet.balance,
        available_balance: wallet.balance - newTotal,
      },
      round: {
        id: round._id.toString(),
        round_number: round.roundNumber,
      },
    })
  } catch (error) {
    console.error('Error placing Bau Cua bet:', error)
    return NextResponse.json({ error: 'Khong the dat cuoc' }, { status: 500 })
  }
}
