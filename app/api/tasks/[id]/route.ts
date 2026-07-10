import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import EventTask from '@/lib/models/EventTask'
import Event from '@/lib/models/Event'
import FamilyMember from '@/lib/models/FamilyMember'
import {
  AuthError,
  authErrorResponse,
  parseObjectId,
  requireUser,
} from '@/lib/authorization'
import { requireString, ValidationError } from '@/lib/api/validate'

async function loadTaskAccess(taskId: string, userId: string) {
  parseObjectId(taskId, 'taskId')
  await connectDB()

  const task = await EventTask.findById(taskId)
  if (!task) {
    throw new AuthError('Công việc không tồn tại', 404)
  }

  const event = await Event.findById(task.eventId)
  if (!event) {
    throw new AuthError('Sự kiện không tồn tại', 404)
  }

  const membership = await FamilyMember.findOne({
    familyId: event.familyId,
    userId,
  })
  if (!membership) {
    throw new AuthError('Bạn không phải thành viên của nhà này', 403)
  }

  return { task, event, membership }
}

function canEditTask(
  task: { assignedTo: { toString(): string } },
  event: { createdBy: { toString(): string } },
  membership: { role: string },
  userId: string
) {
  return (
    task.assignedTo.toString() === userId ||
    event.createdBy.toString() === userId ||
    membership.role === 'admin'
  )
}

function canManageTask(
  event: { createdBy: { toString(): string } },
  membership: { role: string },
  userId: string
) {
  return event.createdBy.toString() === userId || membership.role === 'admin'
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireUser()
    const { task, event, membership } = await loadTaskAccess(id, user.id)
    const body = await request.json()

    // Status update: assignee, event creator, or family admin
    if (body.status !== undefined) {
      if (!['pending', 'completed'].includes(body.status)) {
        return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 })
      }
      if (!canEditTask(task, event, membership, user.id)) {
        return NextResponse.json(
          { error: 'Bạn không có quyền đổi trạng thái công việc này' },
          { status: 403 }
        )
      }
      task.status = body.status
    }

    // Description / reassign: only event manager
    if (body.task !== undefined || body.assignedTo !== undefined) {
      if (!canManageTask(event, membership, user.id)) {
        return NextResponse.json(
          { error: 'Chỉ người tạo sự kiện hoặc admin mới được sửa/phân công lại' },
          { status: 403 }
        )
      }
      if (body.task !== undefined) {
        task.task = requireString(body.task, 'task', { min: 1, max: 500 })
      }
      if (body.assignedTo !== undefined) {
        parseObjectId(String(body.assignedTo), 'assignedTo')
        const assigneeMember = await FamilyMember.findOne({
          familyId: event.familyId,
          userId: body.assignedTo,
        })
        if (!assigneeMember) {
          return NextResponse.json(
            { error: 'Người được giao không thuộc nhà này' },
            { status: 400 }
          )
        }
        task.assignedTo = body.assignedTo
      }
    }

    await task.save()

    return NextResponse.json({
      success: true,
      task: {
        id: task._id.toString(),
        task: task.task,
        status: task.status,
        assignedTo: task.assignedTo.toString(),
        eventId: task.eventId.toString(),
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
    console.error('Error updating task:', error)
    return NextResponse.json({ error: 'Không thể cập nhật công việc' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireUser()
    const { task, event, membership } = await loadTaskAccess(id, user.id)

    if (!canManageTask(event, membership, user.id)) {
      return NextResponse.json(
        { error: 'Chỉ người tạo sự kiện hoặc admin mới được xóa công việc' },
        { status: 403 }
      )
    }

    await EventTask.deleteOne({ _id: task._id })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: 'Không thể xóa công việc' }, { status: 500 })
  }
}
