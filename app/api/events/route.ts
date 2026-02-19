import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import Event from '@/lib/models/Event'
import FamilyMember from '@/lib/models/FamilyMember'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Vui long dang nhap' }, { status: 401 })
    }

    const body = await request.json()
    const familyId = body.familyId || body.family_id
    const title = body.title
    const date = body.date
    const location = body.location

    if (!familyId || !title || !date) {
      return NextResponse.json({ error: 'Thieu thong tin bat buoc' }, { status: 400 })
    }

    await connectDB()

    const membership = await FamilyMember.findOne({
      familyId,
      userId: session.user.id,
    })
    if (!membership) {
      return NextResponse.json(
        { error: 'Ban khong phai thanh vien cua nha nay' },
        { status: 403 }
      )
    }

    const event = await Event.create({
      familyId,
      title: title.trim(),
      date: new Date(date),
      location: location?.trim() || '',
      createdBy: session.user.id,
    })

    await event.populate('createdBy', 'name email avatar')
    const creator = event.createdBy as unknown as {
      _id: { toString(): string }
      name: string
      email: string
      avatar?: string
    }

    return NextResponse.json({
      success: true,
      event: {
        id: event._id.toString(),
        family_id: event.familyId.toString(),
        title: event.title,
        date: event.date,
        location: event.location,
        created_by: creator._id.toString(),
        created_at: event.createdAt,
        creator: {
          id: creator._id.toString(),
          name: creator.name,
          email: creator.email,
          avatar: creator.avatar,
        },
        users: {
          id: creator._id.toString(),
          name: creator.name,
          avatar: creator.avatar,
        },
      },
    })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json({ error: 'Khong the tao su kien' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Vui long dang nhap' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const familyId = searchParams.get('familyId')
    if (!familyId) {
      return NextResponse.json({ error: 'Thieu familyId' }, { status: 400 })
    }

    await connectDB()

    const membership = await FamilyMember.findOne({
      familyId,
      userId: session.user.id,
    })
    if (!membership) {
      return NextResponse.json(
        { error: 'Ban khong phai thanh vien cua nha nay' },
        { status: 403 }
      )
    }

    const events = await Event.find({ familyId })
      .populate('createdBy', 'name email avatar')
      .sort({ date: 1 })
      .lean()

    const formattedEvents = events.map((eventDoc) => {
      const creator = eventDoc.createdBy as unknown as {
        _id: { toString(): string }
        name: string
        email: string
        avatar?: string
      }

      return {
        id: eventDoc._id.toString(),
        family_id: eventDoc.familyId.toString(),
        title: eventDoc.title,
        date: eventDoc.date,
        location: eventDoc.location,
        created_by: creator._id.toString(),
        created_at: eventDoc.createdAt,
        creator: {
          id: creator._id.toString(),
          name: creator.name,
          email: creator.email,
          avatar: creator.avatar,
        },
        users: {
          id: creator._id.toString(),
          name: creator.name,
          avatar: creator.avatar,
        },
      }
    })

    return NextResponse.json({ events: formattedEvents })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json({ error: 'Khong the lay danh sach su kien' }, { status: 500 })
  }
}
