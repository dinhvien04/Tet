import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import BauCuaRound from '@/lib/models/BauCuaRound'
import {
  AuthError,
  authErrorResponse,
  requireFamilyMember,
} from '@/lib/authorization'
import { TransactionNotSupportedError } from '@/lib/mongo-transaction'
import {
  InvariantDriftError,
  settleBauCuaRound,
} from '@/lib/services/bau-cua/settle-round'
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

    const result = await settleBauCuaRound({
      familyId: familyId.toString(),
      userId: user.id,
      isAdmin,
    })

    const res = NextResponse.json({
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
      payoutCount: result.payoutCount ?? 0,
    })
    res.headers.set('x-request-id', requestId)
    return res
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
      console.error('[bau-cua/roll] invariant', requestId, error.message)
      return NextResponse.json(
        {
          error:
            'Lỗi đồng bộ điểm. Ván chưa được chốt — thử lại hoặc liên hệ admin.',
        },
        { status: 409 }
      )
    }
    console.error('[bau-cua/roll]', requestId, error)
    return NextResponse.json({ error: 'Không thể quay xúc xắc' }, { status: 500 })
  }
}
