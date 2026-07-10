import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import BauCuaRound from '@/lib/models/BauCuaRound'
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

const BETTING_WINDOW_MS = 60_000

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const familyIdRaw = body.familyId
    if (!familyIdRaw) {
      return NextResponse.json({ error: 'Thiếu familyId' }, { status: 400 })
    }

    const { user, membership, familyId } = await requireFamilyMember(String(familyIdRaw))
    if (membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Chỉ admin gia đình mới được mở ván Bầu Cua' },
        { status: 403 }
      )
    }

    await connectDB()

    try {
      const result = await withMongoTransaction(async (session) => {
        const q = <T>(query: T): T => {
          if (session && query && typeof (query as { session?: unknown }).session === 'function') {
            return (query as { session: (s: typeof session) => T }).session(session)
          }
          return query
        }

        let state = await q(BauCuaFamilyState.findOne({ familyId }))
        if (!state) {
          try {
            await BauCuaFamilyState.create(
              [
                {
                  familyId,
                  activeRoundId: null,
                  status: 'idle',
                  version: 0,
                  updatedAt: new Date(),
                },
              ],
              session ? { session } : undefined
            )
          } catch {
            // concurrent create
          }
          state = await q(BauCuaFamilyState.findOne({ familyId }))
        }

        if (state?.status === 'betting' || state?.status === 'rolling') {
          const active = state.activeRoundId
            ? await q(BauCuaRound.findById(state.activeRoundId))
            : await q(
                BauCuaRound.findOne({
                  familyId,
                  status: { $in: ['betting', 'rolling'] },
                }).sort({ roundNumber: -1 })
              )

          if (active) {
            return {
              existing: true as const,
              round: active,
            }
          }
        }

        const latestRound = await q(
          BauCuaRound.findOne({ familyId }).sort({ roundNumber: -1 })
        )
        const nextNumber = latestRound ? latestRound.roundNumber + 1 : 1
        const now = new Date()

        const [newRound] = await BauCuaRound.create(
          [
            {
              familyId,
              roundNumber: nextNumber,
              status: 'betting',
              hostUserId: user.id,
              bettingClosesAt: new Date(now.getTime() + BETTING_WINDOW_MS),
              settlementCompleted: false,
              startedAt: now,
            },
          ],
          session ? { session } : undefined
        )

        await BauCuaFamilyState.findOneAndUpdate(
          { familyId },
          {
            $set: {
              activeRoundId: newRound._id,
              status: 'betting',
              updatedAt: now,
            },
            $inc: { version: 1 },
          },
          { upsert: true, ...(session ? { session } : {}) }
        )

        return { existing: false as const, round: newRound }
      })

      const round = result.round
      return NextResponse.json({
        success: true,
        round: {
          id: round._id.toString(),
          roundNumber: round.roundNumber,
          status: round.status,
          hostUserId: round.hostUserId?.toString(),
          bettingClosesAt: round.bettingClosesAt,
          startedAt: round.startedAt,
        },
      })
    } catch (error) {
      if (error instanceof TransactionNotSupportedError) {
        return NextResponse.json(
          {
            error:
              'Máy chủ game cần MongoDB replica set (transaction). Kiểm tra MONGODB_URI / Atlas.',
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
    console.error('Error starting Bau Cua round:', error)
    return NextResponse.json({ error: 'Không thể tạo ván mới' }, { status: 500 })
  }
}
