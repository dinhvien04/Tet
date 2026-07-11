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
      const result = await withMongoTransaction(
        async (session) => {
          const opt = session ? { session } : {}

          // Ensure state document exists
          let state = await BauCuaFamilyState.findOne({ familyId }, null, opt)
          if (!state) {
            try {
              await BauCuaFamilyState.create(
                [
                  {
                    familyId,
                    activeRoundId: null,
                    status: 'idle',
                    version: 0,
                    betRevision: 0,
                    updatedAt: new Date(),
                  },
                ],
                session ? { session } : undefined
              )
            } catch (err: unknown) {
              const e = err as { code?: number }
              if (e.code !== 11000) throw err
            }
            state = await BauCuaFamilyState.findOne({ familyId }, null, opt)
          }

          // Return existing active round idempotently
          if (
            state &&
            (state.status === 'betting' ||
              state.status === 'rolling' ||
              state.status === 'starting')
          ) {
            const active = state.activeRoundId
              ? await BauCuaRound.findById(state.activeRoundId, null, opt)
              : await BauCuaRound.findOne(
                  { familyId, status: { $in: ['betting', 'rolling'] } },
                  null,
                  { ...opt, sort: { roundNumber: -1 } }
                )

            if (active) {
              return { existing: true as const, round: active }
            }
          }

          // CAS: idle → starting (write conflict for concurrent starts)
          const claimed = await BauCuaFamilyState.findOneAndUpdate(
            {
              familyId,
              status: 'idle',
              version: state?.version ?? 0,
            },
            {
              $set: { status: 'starting', updatedAt: new Date() },
              $inc: { version: 1 },
            },
            { new: true, ...opt }
          )

          if (!claimed) {
            // Concurrent start won — return their round
            const current = await BauCuaFamilyState.findOne({ familyId }, null, opt)
            if (current?.activeRoundId) {
              const active = await BauCuaRound.findById(current.activeRoundId, null, opt)
              if (active) {
                return { existing: true as const, round: active }
              }
            }
            const open = await BauCuaRound.findOne(
              { familyId, status: { $in: ['betting', 'rolling'] } },
              null,
              { ...opt, sort: { roundNumber: -1 } }
            )
            if (open) {
              return { existing: true as const, round: open }
            }
            throw new AuthError('Không thể mở ván — trạng thái game đang thay đổi', 409)
          }

          const latestRound = await BauCuaRound.findOne({ familyId }, null, {
            ...opt,
            sort: { roundNumber: -1 },
          })
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
            { familyId, status: 'starting' },
            {
              $set: {
                activeRoundId: newRound._id,
                status: 'betting',
                updatedAt: now,
              },
              $inc: { version: 1 },
            },
            opt
          )

          return { existing: false as const, round: newRound }
        },
        { requireReplicaSet: true }
      )

      const round = result.round
      return NextResponse.json({
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
    } catch (error) {
      if (error instanceof AuthError) {
        const { error: message, status } = authErrorResponse(error)
        return NextResponse.json({ error: message }, { status })
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
      // Duplicate round number race — return existing
      const e = error as { code?: number }
      if (e.code === 11000) {
        const open = await BauCuaRound.findOne({
          familyId,
          status: { $in: ['betting', 'rolling'] },
        }).sort({ roundNumber: -1 })
        if (open) {
          return NextResponse.json({
            success: true,
            idempotent: true,
            round: {
              id: open._id.toString(),
              roundNumber: open.roundNumber,
              status: open.status,
              hostUserId: open.hostUserId?.toString(),
              bettingClosesAt: open.bettingClosesAt,
              startedAt: open.startedAt,
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
