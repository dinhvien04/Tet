import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import BauCuaRound from '@/lib/models/BauCuaRound'
import {
  AuthError,
  authErrorResponse,
  requireFamilyMember,
} from '@/lib/authorization'

const BETTING_WINDOW_MS = 60_000

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const familyIdRaw = body.familyId
    if (!familyIdRaw) {
      return NextResponse.json({ error: 'Thiếu familyId' }, { status: 400 })
    }

    const { user, membership, familyId } = await requireFamilyMember(String(familyIdRaw))
    await connectDB()

    // Only family admin can open a round (host)
    if (membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Chỉ admin gia đình mới được mở ván Bầu Cua' },
        { status: 403 }
      )
    }

    const activeRound = await BauCuaRound.findOne({
      familyId,
      status: { $in: ['betting', 'rolling'] },
    }).sort({ roundNumber: -1 })

    if (activeRound) {
      if (activeRound.status === 'betting') {
        return NextResponse.json({
          success: true,
          round: {
            id: activeRound._id.toString(),
            roundNumber: activeRound.roundNumber,
            status: activeRound.status,
            hostUserId: activeRound.hostUserId?.toString(),
            bettingClosesAt: activeRound.bettingClosesAt,
            startedAt: activeRound.startedAt,
          },
        })
      }

      return NextResponse.json(
        { error: 'Ván trước đang được quay, vui lòng đợi' },
        { status: 409 }
      )
    }

    const latestRound = await BauCuaRound.findOne({ familyId }).sort({ roundNumber: -1 })
    const nextNumber = latestRound ? latestRound.roundNumber + 1 : 1
    const now = new Date()

    try {
      const newRound = await BauCuaRound.create({
        familyId,
        roundNumber: nextNumber,
        status: 'betting',
        hostUserId: user.id,
        bettingClosesAt: new Date(now.getTime() + BETTING_WINDOW_MS),
        settlementCompleted: false,
        startedAt: now,
      })

      return NextResponse.json({
        success: true,
        round: {
          id: newRound._id.toString(),
          roundNumber: newRound.roundNumber,
          status: newRound.status,
          hostUserId: newRound.hostUserId.toString(),
          bettingClosesAt: newRound.bettingClosesAt,
          startedAt: newRound.startedAt,
        },
      })
    } catch (error: unknown) {
      // Unique (familyId, roundNumber) race — return existing active if any
      const err = error as { code?: number }
      if (err.code === 11000) {
        const existing = await BauCuaRound.findOne({
          familyId,
          status: { $in: ['betting', 'rolling'] },
        }).sort({ roundNumber: -1 })

        if (existing) {
          return NextResponse.json({
            success: true,
            round: {
              id: existing._id.toString(),
              roundNumber: existing.roundNumber,
              status: existing.status,
              hostUserId: existing.hostUserId?.toString(),
              bettingClosesAt: existing.bettingClosesAt,
              startedAt: existing.startedAt,
            },
          })
        }
      }
      throw error
    }
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error starting Bau Cua round:', error)
    return NextResponse.json({ error: 'Không thể tạo ván mới' }, { status: 500 })
  }
}
