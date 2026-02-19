import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import Event from '@/lib/models/Event'
import EventTask from '@/lib/models/EventTask'
import FamilyMember from '@/lib/models/FamilyMember'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Vui long dang nhap' }, { status: 401 })
    }

    const eventId = id
    const body = await request.json()
    const task = body.task
    const assignedTo = body.assignedTo || body.assigned_to

    if (!task || !assignedTo) {
      return NextResponse.json({ error: 'Thieu thong tin bat buoc' }, { status: 400 })
    }

    await connectDB()

    const event = await Event.findById(eventId)
    if (!event) {
      return NextResponse.json({ error: 'Su kien khong ton tai' }, { status: 404 })
    }

    const membership = await FamilyMember.findOne({
      familyId: event.familyId,
      userId: session.user.id,
    })
    if (!membership) {
      return NextResponse.json(
        { error: 'Ban khong phai thanh vien cua nha nay' },
        { status: 403 }
      )
    }

    const assigneeMembership = await FamilyMember.findOne({
      familyId: event.familyId,
      userId: assignedTo,
    })
    if (!assigneeMembership) {
      return NextResponse.json(
        { error: 'Nguoi duoc phan cong khong phai thanh vien cua nha nay' },
        { status: 400 }
      )
    }

    const eventTask = await EventTask.create({
      eventId,
      task: task.trim(),
      assignedTo,
      status: 'pending',
    })
    await eventTask.populate('assignedTo', 'name email avatar')

    const assignee = eventTask.assignedTo as unknown as {
      _id: { toString(): string }
      name: string
      email: string
      avatar?: string
    }

    return NextResponse.json({
      success: true,
      task: {
        id: eventTask._id.toString(),
        event_id: eventTask.eventId.toString(),
        task: eventTask.task,
        assigned_to: assignee._id.toString(),
        status: eventTask.status,
        created_at: eventTask.createdAt,
        users: {
          id: assignee._id.toString(),
          name: assignee.name,
          email: assignee.email,
          avatar: assignee.avatar,
        },
      },
    })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json({ error: 'Khong the tao cong viec' }, { status: 500 })
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Vui long dang nhap' }, { status: 401 })
    }

    const eventId = id

    await connectDB()

    const event = await Event.findById(eventId)
    if (!event) {
      return NextResponse.json({ error: 'Su kien khong ton tai' }, { status: 404 })
    }

    const membership = await FamilyMember.findOne({
      familyId: event.familyId,
      userId: session.user.id,
    })
    if (!membership) {
      return NextResponse.json(
        { error: 'Ban khong phai thanh vien cua nha nay' },
        { status: 403 }
      )
    }

    const tasks = await EventTask.find({ eventId })
      .populate('assignedTo', 'name email avatar')
      .sort({ createdAt: 1 })
      .lean()

    const formattedTasks = tasks.map((taskDoc) => {
      const assignee = taskDoc.assignedTo as unknown as {
        _id: { toString(): string }
        name: string
        email: string
        avatar?: string
      }

      return {
        id: taskDoc._id.toString(),
        event_id: taskDoc.eventId.toString(),
        task: taskDoc.task,
        assigned_to: assignee._id.toString(),
        status: taskDoc.status,
        created_at: taskDoc.createdAt,
        users: {
          id: assignee._id.toString(),
          name: assignee.name,
          email: assignee.email,
          avatar: assignee.avatar,
        },
      }
    })

    return NextResponse.json({ tasks: formattedTasks })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: 'Khong the lay danh sach cong viec' }, { status: 500 })
  }
}
