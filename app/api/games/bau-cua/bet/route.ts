import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import {
  AuthError,
  authErrorResponse,
  requireFamilyMember,
} from '@/lib/authorization'
import { TransactionNotSupportedError } from '@/lib/mongo-transaction'
import {
  placeBauCuaBet,
  validateBetPayload,
  STARTING_BALANCE,
} from '@/lib/services/bau-cua/place-bet'
import { getOrCreateRequestId } from '@/lib/request-id'

export async function POST(request: NextRequest) {
  const requestId = getOrCreateRequestId(request)
  try {
    const body = await request.json()
    const familyIdRaw = body.familyId
    if (!familyIdRaw) {
      return NextResponse.json({ error: 'Thiếu familyId' }, { status: 400 })
    }

    const { item, amount, idempotencyKey } = validateBetPayload(body)
    const { user, familyId } = await requireFamilyMember(String(familyIdRaw))
    await connectDB()

    const payload = await placeBauCuaBet({
      familyId: familyId.toString(),
      userId: user.id,
      item,
      amount,
      idempotencyKey,
    })

    const bal = payload.wallet?.balance ?? STARTING_BALANCE
    const reserved = payload.wallet?.reservedBalance ?? 0
    const res = NextResponse.json({
      success: true,
      idempotent: payload.idempotent,
      bet: {
        id: payload.bet._id.toString(),
        item: payload.bet.item,
        amount: payload.bet.amount,
      },
      wallet: {
        balance: bal,
        reservedBalance: reserved,
        availableBalance: bal - reserved,
      },
      round: payload.round
        ? {
            id: payload.round._id.toString(),
            roundNumber: payload.round.roundNumber,
          }
        : null,
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
    console.error('[bau-cua/bet]', requestId, error)
    return NextResponse.json({ error: 'Không thể đặt cược' }, { status: 500 })
  }
}
