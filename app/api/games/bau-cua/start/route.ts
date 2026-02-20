import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import FamilyMember from '@/lib/models/FamilyMember'
import BauCuaRound from '@/lib/models/BauCuaRound'

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

    const latestRound = await BauCuaRound.findOne({ familyId }).sort({ roundNumber: -1 })
    if (latestRound?.status === 'betting') {
      return NextResponse.json({
        success: true,
        round: {
          id: latestRound._id.toString(),
          round_number: latestRound.roundNumber,
          status: latestRound.status,
          started_at: latestRound.startedAt,
        },
      })
    }

    if (latestRound?.status === 'rolling') {
      return NextResponse.json(
        { error: 'Van truoc dang duoc quay, vui long doi' },
        { status: 409 }
      )
    }

    const newRound = await BauCuaRound.create({
      familyId,
      roundNumber: latestRound ? latestRound.roundNumber + 1 : 1,
      status: 'betting',
      startedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      round: {
        id: newRound._id.toString(),
        round_number: newRound.roundNumber,
        status: newRound.status,
        started_at: newRound.startedAt,
      },
    })
  } catch (error) {
    console.error('Error starting Bau Cua round:', error)
    return NextResponse.json({ error: 'Khong the tao van moi' }, { status: 500 })
  }
}
