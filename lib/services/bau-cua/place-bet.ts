import BauCuaRound, { BAU_CUA_ITEMS } from '@/lib/models/BauCuaRound'
import BauCuaBet from '@/lib/models/BauCuaBet'
import BauCuaWallet from '@/lib/models/BauCuaWallet'
import BauCuaFamilyState from '@/lib/models/BauCuaFamilyState'
import {
  TransactionNotSupportedError,
  withMongoTransaction,
} from '@/lib/mongo-transaction'
import { AuthError } from '@/lib/authorization'
import { ensureBauCuaFamilyState } from './start-round'

const MAX_BET = 1000
const STARTING_BALANCE = 1000

function isDuplicateKeyError(err: unknown): boolean {
  const e = err as { code?: number; message?: string }
  return e?.code === 11000 || /E11000|duplicate key/i.test(e?.message || '')
}

export interface PlaceBetInput {
  familyId: string
  userId: string
  item: string
  amount: number
  idempotencyKey: string
}

export interface PlaceBetResult {
  idempotent: boolean
  bet: InstanceType<typeof BauCuaBet>
  wallet: { balance: number; reservedBalance: number } | null
  round: InstanceType<typeof BauCuaRound> | null
}

export function validateBetPayload(body: {
  item?: unknown
  amount?: unknown
  idempotencyKey?: unknown
}): { item: string; amount: number; idempotencyKey: string } {
  const idempotencyKey =
    typeof body.idempotencyKey === 'string' && body.idempotencyKey.trim()
      ? body.idempotencyKey.trim().slice(0, 100)
      : ''
  if (!idempotencyKey) {
    throw new AuthError(
      'Thiếu idempotencyKey (bắt buộc để tránh cược trùng khi retry)',
      400
    )
  }
  const item = typeof body.item === 'string' ? body.item : ''
  if (!BAU_CUA_ITEMS.includes(item as (typeof BAU_CUA_ITEMS)[number])) {
    throw new AuthError('Cửa đặt cược không hợp lệ', 400)
  }
  const amount = Number(body.amount)
  if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_BET) {
    throw new AuthError(
      `Số điểm đặt cược phải là số nguyên từ 1 đến ${MAX_BET}`,
      400
    )
  }
  return { item, amount, idempotencyKey }
}

export async function placeBauCuaBet(input: PlaceBetInput): Promise<PlaceBetResult> {
  const { familyId, userId, item, amount, idempotencyKey } = input

  await ensureBauCuaFamilyState(familyId)

  // Fast path outside TX
  const existingOutside = await BauCuaBet.findOne({
    familyId,
    userId,
    idempotencyKey,
  })
  if (existingOutside) {
    const wallet = await BauCuaWallet.findOne({ familyId, userId })
    const round = await BauCuaRound.findById(existingOutside.roundId)
    return {
      idempotent: true,
      bet: existingOutside,
      wallet: wallet
        ? { balance: wallet.balance, reservedBalance: wallet.reservedBalance }
        : null,
      round,
    }
  }

  try {
    return await withMongoTransaction(
      async (session) => {
        const opt = session ? { session } : {}

        const state = await BauCuaFamilyState.findOneAndUpdate(
          { familyId, status: 'betting', activeRoundId: { $ne: null } },
          {
            $inc: { betRevision: 1 },
            $set: { updatedAt: new Date() },
          },
          { new: true, ...opt }
        )

        if (!state?.activeRoundId) {
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

        const existing = await BauCuaBet.findOne(
          { roundId: round._id, userId, idempotencyKey },
          null,
          opt
        )
        if (existing) {
          const wallet = await BauCuaWallet.findOne({ familyId, userId }, null, opt)
          return {
            idempotent: true as const,
            bet: existing,
            wallet: wallet
              ? { balance: wallet.balance, reservedBalance: wallet.reservedBalance }
              : null,
            round,
          }
        }

        await BauCuaWallet.findOneAndUpdate(
          { familyId, userId },
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
            userId,
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

        // Create bet — on duplicate, abort entire TX (do not continue session)
        const [createdBet] = await BauCuaBet.create(
          [
            {
              roundId: round._id,
              familyId,
              userId,
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
          wallet: {
            balance: wallet.balance,
            reservedBalance: wallet.reservedBalance,
          },
          round,
        }
      },
      { requireReplicaSet: true }
    )
  } catch (error) {
    if (error instanceof AuthError || error instanceof TransactionNotSupportedError) {
      throw error
    }
    if (isDuplicateKeyError(error)) {
      const again = await BauCuaBet.findOne({ familyId, userId, idempotencyKey })
      if (again) {
        const wallet = await BauCuaWallet.findOne({ familyId, userId })
        const round = await BauCuaRound.findById(again.roundId)
        return {
          idempotent: true,
          bet: again,
          wallet: wallet
            ? { balance: wallet.balance, reservedBalance: wallet.reservedBalance }
            : null,
          round,
        }
      }
    }
    throw error
  }
}

export { STARTING_BALANCE, MAX_BET }
