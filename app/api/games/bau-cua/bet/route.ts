import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import BauCuaRound, { BAU_CUA_ITEMS } from '@/lib/models/BauCuaRound'
import BauCuaBet from '@/lib/models/BauCuaBet'
import BauCuaWallet from '@/lib/models/BauCuaWallet'
import {
  AuthError,
  authErrorResponse,
  requireFamilyMember,
} from '@/lib/authorization'
import {
  TransactionNotSupportedError,
  withMongoTransaction,
} from '@/lib/mongo-transaction'

const MAX_BET = 1000
const STARTING_BALANCE = 1000

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const familyIdRaw = body.familyId
    const item = body.item
    const amount = Number(body.amount)
    const idempotencyKey =
      typeof body.idempotencyKey === 'string' && body.idempotencyKey.trim()
        ? body.idempotencyKey.trim().slice(0, 100)
        : undefined

    if (!idempotencyKey) {
      return NextResponse.json(
        { error: 'Thiếu idempotencyKey (bắt buộc để tránh cược trùng khi retry)' },
        { status: 400 }
      )
    }

    if (!familyIdRaw || !item || Number.isNaN(amount)) {
      return NextResponse.json({ error: 'Thiếu dữ liệu đặt cược' }, { status: 400 })
    }

    if (!BAU_CUA_ITEMS.includes(item)) {
      return NextResponse.json({ error: 'Cửa đặt cược không hợp lệ' }, { status: 400 })
    }

    if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_BET) {
      return NextResponse.json(
        { error: `Số điểm đặt cược phải là số nguyên từ 1 đến ${MAX_BET}` },
        { status: 400 }
      )
    }

    const { user, familyId } = await requireFamilyMember(String(familyIdRaw))
    await connectDB()

    try {
      const payload = await withMongoTransaction(async (session) => {
        const roundQ = BauCuaRound.findOne({ familyId, status: 'betting' }).sort({
          roundNumber: -1,
        })
        if (session) roundQ.session(session)
        const round = await roundQ

        if (!round) {
          throw new AuthError('Chưa có ván đang mở để đặt cược', 409)
        }

        if (round.bettingClosesAt && new Date() > round.bettingClosesAt) {
          throw new AuthError('Đã hết thời gian đặt cược', 409)
        }

        const existingQ = BauCuaBet.findOne({
          roundId: round._id,
          userId: user.id,
          idempotencyKey,
        })
        if (session) existingQ.session(session)
        const existing = await existingQ

        if (existing) {
          const walletQ = BauCuaWallet.findOne({ familyId, userId: user.id })
          if (session) walletQ.session(session)
          const wallet = await walletQ
          return {
            idempotent: true as const,
            bet: existing,
            wallet,
            round,
          }
        }

        await BauCuaWallet.findOneAndUpdate(
          { familyId, userId: user.id },
          {
            $setOnInsert: {
              balance: STARTING_BALANCE,
              reservedBalance: 0,
              updatedAt: new Date(),
            },
          },
          { upsert: true, ...(session ? { session } : {}) }
        )

        const wallet = await BauCuaWallet.findOneAndUpdate(
          {
            familyId,
            userId: user.id,
            $expr: {
              $gte: [{ $subtract: ['$balance', '$reservedBalance'] }, amount],
            },
          },
          {
            $inc: { reservedBalance: amount },
            $set: { updatedAt: new Date() },
          },
          { new: true, ...(session ? { session } : {}) }
        )

        if (!wallet) {
          throw new AuthError('Không đủ điểm khả dụng để đặt cược', 400)
        }

        try {
          const [createdBet] = await BauCuaBet.create(
            [
              {
                roundId: round._id,
                familyId,
                userId: user.id,
                item,
                amount,
                idempotencyKey,
                createdAt: new Date(),
              },
            ],
            session ? { session } : undefined
          )

          return {
            idempotent: false as const,
            bet: createdBet,
            wallet,
            round,
          }
        } catch (createError: unknown) {
          const err = createError as { code?: number }
          if (err.code === 11000) {
            const againQ = BauCuaBet.findOne({
              roundId: round._id,
              userId: user.id,
              idempotencyKey,
            })
            if (session) againQ.session(session)
            const again = await againQ
            if (again) {
              await BauCuaWallet.updateOne(
                { _id: wallet._id },
                {
                  $inc: { reservedBalance: -amount },
                  $set: { updatedAt: new Date() },
                },
                session ? { session } : undefined
              )
              const w2Q = BauCuaWallet.findById(wallet._id)
              if (session) w2Q.session(session)
              const w2 = await w2Q
              return {
                idempotent: true as const,
                bet: again,
                wallet: w2,
                round,
              }
            }
          }
          throw createError
        }
      })

      const w = payload.wallet
      const bal = w?.balance ?? STARTING_BALANCE
      const reserved = w?.reservedBalance ?? 0

      return NextResponse.json({
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
        round: {
          id: payload.round._id.toString(),
          roundNumber: payload.round.roundNumber,
        },
      })
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
      throw error
    }
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error placing Bau Cua bet:', error)
    return NextResponse.json({ error: 'Không thể đặt cược' }, { status: 500 })
  }
}
