import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Event from '@/lib/models/Event'
import EventRsvp, { RSVP_STATUSES, type RsvpStatus } from '@/lib/models/EventRsvp'
import FamilyMember from '@/lib/models/FamilyMember'
import {
  AuthError,
  authErrorResponse,
  parseObjectId,
  requireUser,
} from '@/lib/authorization'

async function assertEventMember(eventId: string, userId: string) {
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

  return event
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireUser()
    await assertEventMember(id, user.id)

    const rsvps = await EventRsvp.find({ eventId: id })
      .populate('userId', 'name avatar')
      .lean()

    const counts = { going: 0, maybe: 0, not_going: 0 }
    let myStatus: RsvpStatus | null = null

    const list = rsvps.map((r) => {
      counts[r.status] += 1
      if (r.userId && (r.userId as { _id?: { toString(): string } })._id?.toString() === user.id) {
        myStatus = r.status
      } else if (r.userId?.toString?.() === user.id) {
        myStatus = r.status
      }

      const u = r.userId as unknown as {
        _id: { toString(): string }
        name: string
        avatar?: string
      }

      return {
        userId: u._id.toString(),
        name: u.name,
        avatar: u.avatar ?? null,
        status: r.status,
        updatedAt: r.updatedAt,
      }
    })

    // Fix myStatus when populate shape differs
    const mine = await EventRsvp.findOne({ eventId: id, userId: user.id }).lean()
    if (mine) myStatus = mine.status

    return NextResponse.json({
      myStatus,
      counts,
      rsvps: list,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error fetching RSVP:', error)
    return NextResponse.json({ error: 'Không thể tải RSVP' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireUser()
    await assertEventMember(id, user.id)

    const body = await request.json()
    const status = body.status as RsvpStatus
    if (!RSVP_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'Trạng thái RSVP không hợp lệ (going | maybe | not_going)' },
        { status: 400 }
      )
    }

    const rsvp = await EventRsvp.findOneAndUpdate(
      { eventId: id, userId: user.id },
      { $set: { status } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    return NextResponse.json({
      success: true,
      rsvp: {
        eventId: id,
        userId: user.id,
        status: rsvp.status,
        updatedAt: rsvp.updatedAt,
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error saving RSVP:', error)
    return NextResponse.json({ error: 'Không thể lưu RSVP' }, { status: 500 })
  }
}
