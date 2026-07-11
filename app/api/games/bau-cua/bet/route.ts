import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import BauCuaRound, { BAU_CUA_ITEMS } from '@/lib/models/BauCuaRound'
import BauCuaBet from '@/lib/models/BauCuaBet'
import BauCuaWallet from '@/lib/models/BauCuaWallet'
import BauCuaFamilyState from '@/lib/models/BauCuaFamilyState'
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

function isDuplicateKeyError(err: unknown): boolean {
  const e = err as { code?: number; message?: string }
  return e?.code === 11000 || /E11000|duplicate key/i.test(e?.message || '')
}

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

    // Fast path: existing bet outside transaction (idempotent retry)
    const existingOutside = await BauCuaBet.findOne({
      familyId,
      userId: user.id,
      idempotencyKey,
    })
    if (existingOutside) {
      const wallet = await BauCuaWallet.findOne({ familyId, userId: user.id })
      const round = await BauCuaRound.findById(existingOutside.roundId)
      const bal = wallet?.balance ?? STARTING_BALANCE
      const reserved = wallet?.reservedBalance ?? 0
      return NextResponse.json({
        success: true,
        idempotent: true,
        bet: {
          id: existingOutside._id.toString(),
          item: existingOutside.item,
          amount: existingOutside.amount,
        },
        wallet: {
          balance: bal,
          reservedBalance: reserved,
          availableBalance: bal - reserved,
        },
        round: round
          ? { id: round._id.toString(), roundNumber: round.roundNumber }
          : null,
      })
    }

    try {
      const payload = await withMongoTransaction(
        async (session) => {
          const opt = session ? { session } : {}

          // CAS lock on family state: must be betting with active round
          // Write conflict with ROLL (which sets status=rolling) and concurrent BETs (betRevision)
          const state = await BauCuaFamilyState.findOneAndUpdate(
            { familyId, status: 'betting', activeRoundId: { $ne: null } },
            {
              $inc: { betRevision: 1 },
              $set: { updatedAt: new Date() },
            },
            { new: true, ...opt }
          )

          if (!state || !state.activeRoundId) {
            throw new AuthError('Chưa có ván đang mở để đặt cược', 409)
          }

          const round = await BauCuaRound.findOne(
            {
              _id: state.activeRoundId,
              familyId,
              status: 'betting',
              settlementCompleted: false,
            },
            null,
            opt
          )

          if (!round) {
            throw new AuthError('Chưa có ván đang mở để đặt cược', 409)
          }

          if (round.bettingClosesAt && new Date() > round.bettingClosesAt) {
            throw new AuthError('Đã hết thời gian đặt cược', 409)
          }

          // Idempotency inside transaction
          const existing = await BauCuaBet.findOne(
            {
              roundId: round._id,
              userId: user.id,
              idempotencyKey,
            },
            null,
            opt
          )

          if (existing) {
            const wallet = await BauCuaWallet.findOne(
              { familyId, userId: user.id },
              null,
              opt
            )
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
            { upsert: true, ...opt }
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
            { new: true, ...opt }
          )

          if (!wallet) {
            throw new AuthError('Không đủ điểm khả dụng để đặt cược', 400)
          }

          // Create bet — on duplicate key, abort entire transaction (do not continue)
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
        },
        { requireReplicaSet: true }
      )

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
      // Duplicate idempotency: transaction aborted + rolled back reserve.
      // Return existing bet outside transaction.
      if (isDuplicateKeyError(error)) {
        const again = await BauCuaBet.findOne({
          familyId,
          userId: user.id,
          idempotencyKey,
        })
        if (again) {
          const wallet = await BauCuaWallet.findOne({ familyId, userId: user.id })
          const round = await BauCuaRound.findById(again.roundId)
          const bal = wallet?.balance ?? STARTING_BALANCE
          const reserved = wallet?.reservedBalance ?? 0
          return NextResponse.json({
            success: true,
            idempotent: true,
            bet: {
              id: again._id.toString(),
              item: again.item,
              amount: again.amount,
            },
            wallet: {
              balance: bal,
              reservedBalance: reserved,
              availableBalance: bal - reserved,
            },
            round: round
              ? { id: round._id.toString(), roundNumber: round.roundNumber }
              : null,
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
    console.error('Error placing Bau Cua bet:', error)
    return NextResponse.json({ error: 'Không thể đặt cược' }, { status: 500 })
  }
}
