import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import FamilyMember from '@/lib/models/FamilyMember'
import Event from '@/lib/models/Event'
import type { UserRole } from '@/lib/system-admin'

export class AuthError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}

export function parseObjectId(value: unknown, fieldName = 'id'): mongoose.Types.ObjectId {
  if (typeof value !== 'string' || !mongoose.Types.ObjectId.isValid(value)) {
    throw new AuthError(`${fieldName} không hợp lệ`, 400)
  }
  return new mongoose.Types.ObjectId(value)
}

export async function requireUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new AuthError('Vui lòng đăng nhập', 401)
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
    role: (session.user.role || 'user') as UserRole,
  }
}

export async function requireSystemAdmin() {
  const user = await requireUser()
  if (user.role !== 'admin') {
    throw new AuthError('Chỉ quản trị hệ thống mới được thực hiện thao tác này', 403)
  }
  return user
}

export async function requireFamilyMember(familyId: string) {
  const user = await requireUser()
  await connectDB()

  const familyObjectId = parseObjectId(familyId, 'familyId')
  const membership = await FamilyMember.findOne({
    familyId: familyObjectId,
    userId: user.id,
  })

  if (!membership) {
    throw new AuthError('Bạn không phải thành viên của nhà này', 403)
  }

  return { user, membership, familyId: familyObjectId }
}

export async function requireFamilyAdmin(familyId: string) {
  const result = await requireFamilyMember(familyId)
  if (result.membership.role !== 'admin') {
    throw new AuthError('Chỉ admin gia đình mới được thực hiện thao tác này', 403)
  }
  return result
}

export async function requireEventManager(eventId: string) {
  const user = await requireUser()
  await connectDB()

  const eventObjectId = parseObjectId(eventId, 'eventId')
  const event = await Event.findById(eventObjectId)
  if (!event) {
    throw new AuthError('Không tìm thấy sự kiện', 404)
  }

  const membership = await FamilyMember.findOne({
    familyId: event.familyId,
    userId: user.id,
  })

  if (!membership) {
    throw new AuthError('Bạn không phải thành viên của nhà này', 403)
  }

  const isCreator = event.createdBy.toString() === user.id
  const isFamilyAdmin = membership.role === 'admin'

  if (!isCreator && !isFamilyAdmin) {
    throw new AuthError('Bạn không có quyền quản lý sự kiện này', 403)
  }

  return { user, membership, event }
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return { error: error.message, status: error.status }
  }
  console.error('Unexpected auth error:', error)
  return { error: 'Có lỗi xảy ra', status: 500 }
}
