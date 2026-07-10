import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Event from '@/lib/models/Event'
import {
  AuthError,
  authErrorResponse,
  requireFamilyMember,
  requireUser,
} from '@/lib/authorization'
import {
  optionalString,
  parseJsonBody,
  pickFamilyId,
  requireDate,
  requireEnum,
  requireObjectIdString,
  requireString,
  ValidationError,
  validationErrorResponse,
} from '@/lib/api/validate'
import { parseLimit, decodeCursor, cursorFilter, buildNextCursor } from '@/lib/api/pagination'

const MAX_TITLE = 200
const MAX_LOCATION = 500
const FILTERS = ['all', 'upcoming', 'past'] as const

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request)
    const familyId = pickFamilyId(body)
    const title = requireString(body.title, 'title', { max: MAX_TITLE })
    const date = requireDate(body.date, 'date')
    const location = optionalString(body.location, 'location', { max: MAX_LOCATION }) || ''

    const { user, familyId: familyObjectId } = await requireFamilyMember(familyId)

    const event = await Event.create({
      familyId: familyObjectId,
      title,
      date,
      location,
      createdBy: user.id,
    })

    await event.populate('createdBy', 'name email avatar')
    const creator = event.createdBy as unknown as {
      _id: { toString(): string }
      name: string
      email: string
      avatar?: string
    }

    const familyIdStr = event.familyId.toString()
    const creatorId = creator._id.toString()

    return NextResponse.json({
      success: true,
      event: {
        id: event._id.toString(),
        familyId: familyIdStr,
        title: event.title,
        date: event.date,
        location: event.location,
        createdBy: creatorId,
        createdAt: event.createdAt,
        // legacy aliases for existing UI types
        family_id: familyIdStr,
        created_by: creatorId,
        created_at: event.createdAt,
        creator: {
          id: creatorId,
          name: creator.name,
          email: creator.email,
          avatar: creator.avatar,
        },
        users: {
          id: creatorId,
          name: creator.name,
          avatar: creator.avatar,
        },
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    if (error instanceof ValidationError || error instanceof SyntaxError) {
      const { error: message, status } = validationErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error creating event:', error)
    return NextResponse.json({ error: 'Không thể tạo sự kiện' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireUser()
    const { searchParams } = new URL(request.url)
    const familyIdRaw = searchParams.get('familyId')
    if (!familyIdRaw) {
      return NextResponse.json({ error: 'Thiếu familyId' }, { status: 400 })
    }
    const familyId = requireObjectIdString(familyIdRaw, 'familyId')

    const filterRaw = (searchParams.get('filter') || 'all').toLowerCase()
    const filter = requireEnum(filterRaw, 'filter', FILTERS)
    const limit = parseLimit(searchParams.get('limit'))
    const cursor = decodeCursor(searchParams.get('cursor'))

    const { familyId: familyObjectId } = await requireFamilyMember(familyId)
    await connectDB()

    const now = new Date()
    // Past: newest first (desc); upcoming/all: soonest first (asc)
    const sortDir = filter === 'past' ? -1 : 1
    const cursorDir = filter === 'past' ? 'desc' : 'asc'

    const andClauses: Record<string, unknown>[] = [{ familyId: familyObjectId }]
    if (filter === 'upcoming') {
      andClauses.push({ date: { $gte: now } })
    } else if (filter === 'past') {
      andClauses.push({ date: { $lt: now } })
    }
    const cursorPart = cursorFilter(cursor, 'date', cursorDir)
    if (Object.keys(cursorPart).length > 0) {
      andClauses.push(cursorPart)
    }

    const query = andClauses.length === 1 ? andClauses[0] : { $and: andClauses }

    const events = await Event.find(query)
      .populate('createdBy', 'name email avatar')
      .sort({ date: sortDir, _id: sortDir })
      .limit(limit)
      .lean()

    const nextCursor = buildNextCursor(
      events as Array<{ date?: Date; createdAt: Date; _id: { toString(): string } }>,
      limit,
      'date'
    )

    const formattedEvents = events.map((eventDoc) => {
      const creator = eventDoc.createdBy as unknown as {
        _id: { toString(): string }
        name: string
        email: string
        avatar?: string
      }
      const familyIdStr = eventDoc.familyId.toString()
      const creatorId = creator._id.toString()

      return {
        id: eventDoc._id.toString(),
        familyId: familyIdStr,
        title: eventDoc.title,
        date: eventDoc.date,
        location: eventDoc.location,
        createdBy: creatorId,
        createdAt: eventDoc.createdAt,
        family_id: familyIdStr,
        created_by: creatorId,
        created_at: eventDoc.createdAt,
        creator: {
          id: creatorId,
          name: creator.name,
          email: creator.email,
          avatar: creator.avatar,
        },
        users: {
          id: creatorId,
          name: creator.name,
          avatar: creator.avatar,
        },
      }
    })

    return NextResponse.json({
      events: formattedEvents,
      nextCursor,
      limit,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    if (error instanceof ValidationError) {
      const { error: message, status } = validationErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error fetching events:', error)
    return NextResponse.json({ error: 'Không thể lấy danh sách sự kiện' }, { status: 500 })
  }
}
