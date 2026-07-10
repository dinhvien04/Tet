import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Event from '@/lib/models/Event'
import FamilyMember from '@/lib/models/FamilyMember'
import {
  AuthError,
  authErrorResponse,
  parseObjectId,
  requireUser,
} from '@/lib/authorization'
import { buildEventIcs } from '@/lib/ics'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    parseObjectId(id, 'eventId')
    const user = await requireUser()
    await connectDB()

    const event = await Event.findById(id)
    if (!event) {
      return NextResponse.json({ error: 'Không tìm thấy sự kiện' }, { status: 404 })
    }

    const membership = await FamilyMember.findOne({
      familyId: event.familyId,
      userId: user.id,
    })
    if (!membership) {
      return NextResponse.json(
        { error: 'Bạn không phải thành viên của nhà này' },
        { status: 403 }
      )
    }

    const ics = buildEventIcs({
      id: event._id.toString(),
      title: event.title,
      date: new Date(event.date),
      location: event.location,
      description: `Sự kiện gia đình trên Tết Connect`,
    })

    const safeName = event.title.replace(/[^\w\u00C0-\u1EF9\- ]+/g, '').slice(0, 40) || 'su-kien'

    return new NextResponse(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeName}.ics"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('ICS export error:', error)
    return NextResponse.json({ error: 'Không thể xuất lịch' }, { status: 500 })
  }
}
