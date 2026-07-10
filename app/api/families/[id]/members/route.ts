import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import FamilyMember from '@/lib/models/FamilyMember'
import {
  AuthError,
  authErrorResponse,
  parseObjectId,
  requireFamilyAdmin,
  requireFamilyMember,
  requireUser,
} from '@/lib/authorization'
import {
  TransactionNotSupportedError,
  withMongoTransaction,
} from '@/lib/mongo-transaction'
import { requireEnum, requireObjectIdString, ValidationError } from '@/lib/api/validate'

function formatMember(member: {
  _id: { toString(): string }
  userId: unknown
  role: string
  joinedAt: Date
}) {
  const user = member.userId as {
    _id: { toString(): string }
    name: string
    email: string
    avatar?: string
  }

  return {
    id: member._id.toString(),
    userId: user._id.toString(),
    user_id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: member.role,
    joinedAt: member.joinedAt,
    joined_at: member.joinedAt,
    users: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    },
  }
}

class LastAdminError extends Error {
  status = 400
  constructor(message = 'Nhà phải có ít nhất 1 admin') {
    super(message)
    this.name = 'LastAdminError'
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    parseObjectId(id, 'familyId')
    await requireFamilyMember(id)

    const members = await FamilyMember.find({ familyId: id })
      .populate('userId', 'name email avatar')
      .lean()

    return NextResponse.json({ members: members.map(formatMember) })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error fetching members:', error)
    return NextResponse.json({ error: 'Không thể lấy danh sách thành viên' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: familyId } = await params
    parseObjectId(familyId, 'familyId')
    await requireFamilyAdmin(familyId)

    const body = await request.json()
    const memberId = requireObjectIdString(body.memberId, 'memberId')
    const role = requireEnum(body.role, 'role', ['admin', 'member'] as const)

    await connectDB()

    try {
      const updated = await withMongoTransaction(async (session) => {
        const q = <T>(query: T): T => {
          if (
            session &&
            query &&
            typeof (query as unknown as { session?: unknown }).session === 'function'
          ) {
            return (query as unknown as { session: (s: typeof session) => T }).session(
              session
            )
          }
          return query
        }

        const target = await q(
          FamilyMember.findOne({ _id: memberId, familyId }).populate(
            'userId',
            'name email avatar'
          )
        )
        if (!target) {
          throw new AuthError('Không tìm thấy thành viên', 404)
        }

        // Demoting an admin: require another admin inside the same transaction
        if (target.role === 'admin' && role === 'member') {
          const adminCount = await FamilyMember.countDocuments(
            { familyId, role: 'admin' },
            session ? { session } : undefined
          )
          if (adminCount <= 1) {
            throw new LastAdminError()
          }
        }

        target.role = role
        await target.save(session ? { session } : undefined)
        return target
      })

      // Ensure populated shape for response
      await updated.populate('userId', 'name email avatar')

      return NextResponse.json({
        success: true,
        member: formatMember(updated),
      })
    } catch (error) {
      if (error instanceof LastAdminError) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      if (error instanceof TransactionNotSupportedError) {
        return NextResponse.json(
          { error: 'Cần MongoDB replica set để đổi quyền an toàn' },
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
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error updating member role:', error)
    return NextResponse.json({ error: 'Không thể cập nhật quyền thành viên' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: familyId } = await params
    parseObjectId(familyId, 'familyId')
    const user = await requireUser()
    await requireFamilyAdmin(familyId)

    const memberIdRaw = request.nextUrl.searchParams.get('memberId')
    if (!memberIdRaw) {
      return NextResponse.json({ error: 'Thiếu memberId' }, { status: 400 })
    }
    const memberId = requireObjectIdString(memberIdRaw, 'memberId')

    await connectDB()

    try {
      await withMongoTransaction(async (session) => {
        const target = await FamilyMember.findOne(
          { _id: memberId, familyId },
          null,
          session ? { session } : undefined
        )
        if (!target) {
          throw new AuthError('Không tìm thấy thành viên', 404)
        }

        if (target.userId.toString() === user.id) {
          throw new AuthError('Không thể tự xóa chính mình', 400)
        }

        if (target.role === 'admin') {
          const adminCount = await FamilyMember.countDocuments(
            { familyId, role: 'admin' },
            session ? { session } : undefined
          )
          if (adminCount <= 1) {
            throw new LastAdminError()
          }
        }

        await FamilyMember.deleteOne(
          { _id: target._id },
          session ? { session } : undefined
        )
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      if (error instanceof LastAdminError) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      if (error instanceof TransactionNotSupportedError) {
        return NextResponse.json(
          { error: 'Cần MongoDB replica set để xóa thành viên an toàn' },
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
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error deleting family member:', error)
    return NextResponse.json({ error: 'Không thể xóa thành viên' }, { status: 500 })
  }
}
