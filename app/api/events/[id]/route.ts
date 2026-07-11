import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Event from '@/lib/models/Event'
import EventTask from '@/lib/models/EventTask'
import EventRsvp from '@/lib/models/EventRsvp'
import Notification from '@/lib/models/Notification'
import FamilyMember from '@/lib/models/FamilyMember'
import {
  AuthError,
  authErrorResponse,
  parseObjectId,
  requireUser,
} from '@/lib/authorization'
import { requireString, optionalString, ValidationError } from '@/lib/api/validate'
import {
  TransactionNotSupportedError,
  withMongoTransaction,
} from '@/lib/mongo-transaction'

async function loadEventAccess(eventId: string, userId: string) {
  parseObjectId(eventId, 'eventId')
  await connectDB()

  const event = await Event.findById(eventId)
  if (!event) {
    throw new AuthError('Không tìm thấy sự kiện', 404)
  }

  const membership = await FamilyMember.findOne({
    familyId: event.familyId,
    userId,
  })
  if (!membership) {
    throw new AuthError('Bạn không phải thành viên của nhà này', 403)
  }

  return { event, membership }
}

function canManageEvent(
  event: { createdBy: { toString(): string } },
  membership: { role: string },
  userId: string
) {
  return event.createdBy.toString() === userId || membership.role === 'admin'
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireUser()
    const { event } = await loadEventAccess(id, user.id)

    await event.populate('createdBy', 'name avatar')
    const creator = event.createdBy as unknown as {
      _id: { toString(): string }
      name: string
      avatar?: string
    }

    return NextResponse.json({
      id: event._id.toString(),
      title: event.title,
      date: event.date,
      location: event.location ?? null,
      familyId: event.familyId.toString(),
      createdBy: creator._id.toString(),
      createdAt: event.createdAt,
      users: {
        id: creator._id.toString(),
        name: creator.name,
        avatar: creator.avatar ?? null,
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error fetching event:', error)
    return NextResponse.json({ error: 'Không thể tải sự kiện' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireUser()
    const { event, membership } = await loadEventAccess(id, user.id)

    if (!canManageEvent(event, membership, user.id)) {
      return NextResponse.json(
        { error: 'Chỉ người tạo sự kiện hoặc admin mới được sửa' },
        { status: 403 }
      )
    }

    const body = await request.json()

    if (body.title !== undefined) {
      event.title = requireString(body.title, 'title', { min: 1, max: 200 })
    }
    if (body.date !== undefined) {
      const date = new Date(body.date)
      if (Number.isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Ngày không hợp lệ' }, { status: 400 })
      }
      event.date = date
    }
    if (body.location !== undefined) {
      event.location = optionalString(body.location, 'location', { max: 300 }) || undefined
    }

    await event.save()

    return NextResponse.json({
      success: true,
      event: {
        id: event._id.toString(),
        title: event.title,
        date: event.date,
        location: event.location ?? null,
        familyId: event.familyId.toString(),
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error updating event:', error)
    return NextResponse.json({ error: 'Không thể cập nhật sự kiện' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireUser()
    const { event, membership } = await loadEventAccess(id, user.id)

    if (!canManageEvent(event, membership, user.id)) {
      return NextResponse.json(
        { error: 'Chỉ người tạo sự kiện hoặc admin mới được xóa' },
        { status: 403 }
      )
    }

    const eventIdStr = event._id.toString()
    try {
      await withMongoTransaction(
        async (session) => {
          const opt = session ? { session } : {}
          await EventTask.deleteMany({ eventId: event._id }, opt)
          await EventRsvp.deleteMany({ eventId: event._id }, opt)
          // Notifications use link/dedupeKey referencing the event path
          await Notification.deleteMany(
            {
              $or: [
                { link: { $regex: eventIdStr } },
                { dedupeKey: { $regex: eventIdStr } },
              ],
            },
            opt
          )
          await Event.deleteOne({ _id: event._id }, opt)
        },
        { requireReplicaSet: true }
      )
    } catch (error) {
      if (error instanceof TransactionNotSupportedError) {
        return NextResponse.json(
          { error: 'Cần MongoDB replica set để xóa sự kiện an toàn' },
          { status: 503 }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error deleting event:', error)
    return NextResponse.json({ error: 'Không thể xóa sự kiện' }, { status: 500 })
  }
}
