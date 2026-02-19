import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import EventTask from '@/lib/models/EventTask'
import Event from '@/lib/models/Event'
import FamilyMember from '@/lib/models/FamilyMember'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Vui lòng đăng nhập' },
        { status: 401 }
      )
    }

    const taskId = id
    const { status } = await request.json()

    // Validate status
    if (!status || !['pending', 'completed'].includes(status)) {
      return NextResponse.json(
        { error: 'Trạng thái không hợp lệ' },
        { status: 400 }
      )
    }

    await connectDB()

    // Find task
    const task = await EventTask.findById(taskId)
    
    if (!task) {
      return NextResponse.json(
        { error: 'Công việc không tồn tại' },
        { status: 404 }
      )
    }

    // Get event to check family membership
    const event = await Event.findById(task.eventId)
    
    if (!event) {
      return NextResponse.json(
        { error: 'Sự kiện không tồn tại' },
        { status: 404 }
      )
    }

    // Check if user is a member of the family
    const membership = await FamilyMember.findOne({
      familyId: event.familyId,
      userId: session.user.id,
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Bạn không phải thành viên của nhà này' },
        { status: 403 }
      )
    }

    // Update task status
    task.status = status
    await task.save()

    return NextResponse.json({
      success: true,
      task: {
        id: task._id.toString(),
        status: task.status,
      },
    })
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Không thể cập nhật công việc' },
      { status: 500 }
    )
  }
}
