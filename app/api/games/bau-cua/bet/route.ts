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

    const round = await BauCuaRound.findOne({
      familyId,
      status: 'betting',
    }).sort({ roundNumber: -1 })

    if (!round) {
      return NextResponse.json({ error: 'Chưa có ván đang mở để đặt cược' }, { status: 409 })
    }

    if (round.bettingClosesAt && new Date() > round.bettingClosesAt) {
      return NextResponse.json({ error: 'Đã hết thời gian đặt cược' }, { status: 409 })
    }

    // Idempotent retry
    if (idempotencyKey) {
      const existing = await BauCuaBet.findOne({
        roundId: round._id,
        userId: user.id,
        idempotencyKey,
      })
      if (existing) {
        const wallet = await BauCuaWallet.findOne({ familyId, userId: user.id }).lean()
        return NextResponse.json({
          success: true,
          idempotent: true,
          bet: {
            id: existing._id.toString(),
            item: existing.item,
            amount: existing.amount,
          },
          wallet: {
            balance: wallet?.balance ?? STARTING_BALANCE,
            reservedBalance: wallet?.reservedBalance ?? 0,
            availableBalance:
              (wallet?.balance ?? STARTING_BALANCE) - (wallet?.reservedBalance ?? 0),
          },
        })
      }
    }

    // Ensure wallet exists
    await BauCuaWallet.findOneAndUpdate(
      { familyId, userId: user.id },
      {
        $setOnInsert: {
          balance: STARTING_BALANCE,
          reservedBalance: 0,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    )

    // Atomic reserve: only if available balance covers amount
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
      { new: true }
    )

    if (!wallet) {
      return NextResponse.json(
        { error: 'Không đủ điểm khả dụng để đặt cược' },
        { status: 400 }
      )
    }

    // Double-check round still betting (CAS)
    const stillOpen = await BauCuaRound.findOne({
      _id: round._id,
      status: 'betting',
    })
    if (!stillOpen) {
      // Release reservation
      await BauCuaWallet.updateOne(
        { _id: wallet._id },
        { $inc: { reservedBalance: -amount }, $set: { updatedAt: new Date() } }
      )
      return NextResponse.json({ error: 'Ván đã khóa, không thể đặt cược' }, { status: 409 })
    }

    try {
      const createdBet = await BauCuaBet.create({
        roundId: round._id,
        familyId,
        userId: user.id,
        item,
        amount,
        idempotencyKey,
        createdAt: new Date(),
      })

      return NextResponse.json({
        success: true,
        bet: {
          id: createdBet._id.toString(),
          item: createdBet.item,
          amount: createdBet.amount,
        },
        wallet: {
          balance: wallet.balance,
          reservedBalance: wallet.reservedBalance,
          availableBalance: wallet.balance - wallet.reservedBalance,
        },
        round: {
          id: round._id.toString(),
          roundNumber: round.roundNumber,
        },
      })
    } catch (createError: unknown) {
      // Rollback reservation on bet insert failure (incl. duplicate idempotency)
      await BauCuaWallet.updateOne(
        { _id: wallet._id },
        { $inc: { reservedBalance: -amount }, $set: { updatedAt: new Date() } }
      )

      const err = createError as { code?: number }
      if (err.code === 11000 && idempotencyKey) {
        const existing = await BauCuaBet.findOne({
          roundId: round._id,
          userId: user.id,
          idempotencyKey,
        })
        if (existing) {
          const fresh = await BauCuaWallet.findOne({ familyId, userId: user.id }).lean()
          return NextResponse.json({
            success: true,
            idempotent: true,
            bet: {
              id: existing._id.toString(),
              item: existing.item,
              amount: existing.amount,
            },
            wallet: {
              balance: fresh?.balance ?? STARTING_BALANCE,
              reservedBalance: fresh?.reservedBalance ?? 0,
              availableBalance:
                (fresh?.balance ?? STARTING_BALANCE) - (fresh?.reservedBalance ?? 0),
            },
          })
        }
      }
      throw createError
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
