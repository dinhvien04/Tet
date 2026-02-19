import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import Event from '@/lib/models/Event'
import FamilyMember from '@/lib/models/FamilyMember'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    // Fetch event with creator info
    const event = await Event.findById(id)
      .populate('createdBy', 'name email avatar')
      .lean()

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Verify user is member of the family
    const membership = await FamilyMember.findOne({
      familyId: event.familyId,
      userId: session.user.id,
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this family' },
        { status: 403 }
      )
    }

    // Format response
    const creator = event.createdBy as unknown as {
      _id: { toString(): string }
      name: string
      avatar?: string
    }

    const formattedEvent = {
      id: event._id.toString(),
      title: event.title,
      date: event.date,
      location: event.location,
      family_id: event.familyId.toString(),
      created_by: creator._id.toString(),
      created_at: event.createdAt,
      users: {
        id: creator._id.toString(),
        name: creator.name,
        avatar: creator.avatar,
      },
    }

    return NextResponse.json(formattedEvent)
  } catch (error) {
    console.error('Error fetching event:', error)
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    )
  }
}
