import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import {
  AuthError,
  authErrorResponse,
  requireFamilyMember,
} from '@/lib/authorization'
import { TransactionNotSupportedError } from '@/lib/mongo-transaction'
import {
  BauCuaConflictError,
  startBauCuaRound,
} from '@/lib/services/bau-cua/start-round'
import { getOrCreateRequestId } from '@/lib/request-id'

export async function POST(request: NextRequest) {
  const requestId = getOrCreateRequestId(request)
  try {
    const body = await request.json()
    const familyIdRaw = body.familyId
    if (!familyIdRaw) {
      return NextResponse.json({ error: 'Thiếu familyId' }, { status: 400 })
    }

    const { user, membership, familyId } = await requireFamilyMember(
      String(familyIdRaw)
    )
    if (membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Chỉ admin gia đình mới được mở ván Bầu Cua' },
        { status: 403 }
      )
    }

    await connectDB()
    const result = await startBauCuaRound({
      familyId: familyId.toString(),
      hostUserId: user.id,
    })

    const round = result.round
    const res = NextResponse.json({
      success: true,
      idempotent: result.existing,
      round: {
        id: round._id.toString(),
        roundNumber: round.roundNumber,
        status: round.status,
        hostUserId: round.hostUserId?.toString(),
        bettingClosesAt: round.bettingClosesAt,
        startedAt: round.startedAt,
      },
    })
    res.headers.set('x-request-id', requestId)
    return res
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    if (error instanceof BauCuaConflictError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof TransactionNotSupportedError) {
      return NextResponse.json(
        {
          error:
            'Máy chủ game cần MongoDB replica set (transaction). Kiểm tra MONGODB_URI / Atlas.',
        },
        { status: 503 }
      )
    }
    console.error('[bau-cua/start]', requestId, error)
    return NextResponse.json({ error: 'Không thể tạo ván mới' }, { status: 500 })
  }
}
