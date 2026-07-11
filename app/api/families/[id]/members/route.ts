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
import {
  casDecrementFamilyAdmin,
  casIncrementFamilyAdmin,
} from '@/lib/admin-invariant'
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
    email?: string
    avatar?: string
  }

  return {
    id: member._id.toString(),
    userId: user._id.toString(),
    name: user.name,
    avatar: user.avatar,
    role: member.role,
    joinedAt: member.joinedAt,
    users: {
      id: user._id.toString(),
      name: user.name,
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
      .populate('userId', 'name avatar')
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
      const updated = await withMongoTransaction(
        async (session) => {
          const opt = session ? { session } : {}

          const target = await FamilyMember.findOne(
            { _id: memberId, familyId },
            null,
            opt
          ).populate('userId', 'name avatar')

          if (!target) {
            throw new AuthError('Không tìm thấy thành viên', 404)
          }

          if (target.role === role) {
            return target
          }

          // Demoting admin → member: CAS shared admin lock
          if (target.role === 'admin' && role === 'member') {
            const ok = await casDecrementFamilyAdmin(familyId, session)
            if (!ok) {
              throw new LastAdminError()
            }
          }

          // Promoting member → admin
          if (target.role === 'member' && role === 'admin') {
            await casIncrementFamilyAdmin(familyId, session)
          }

          target.role = role
          await target.save(opt)
          return target
        },
        { requireReplicaSet: true }
      )

      await updated.populate('userId', 'name avatar')

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
      await withMongoTransaction(
        async (session) => {
          const opt = session ? { session } : {}
          const target = await FamilyMember.findOne(
            { _id: memberId, familyId },
            null,
            opt
          )
          if (!target) {
            throw new AuthError('Không tìm thấy thành viên', 404)
          }

          if (target.userId.toString() === user.id) {
            throw new AuthError('Không thể tự xóa chính mình', 400)
          }

          if (target.role === 'admin') {
            const ok = await casDecrementFamilyAdmin(familyId, session)
            if (!ok) {
              throw new LastAdminError()
            }
          }

          await FamilyMember.deleteOne({ _id: target._id }, opt)
        },
        { requireReplicaSet: true }
      )

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
