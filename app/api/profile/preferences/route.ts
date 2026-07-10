import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/lib/models/User'
import {
  AuthError,
  authErrorResponse,
  requireUser,
} from '@/lib/authorization'

export async function GET() {
  try {
    const sessionUser = await requireUser()
    await connectDB()

    const user = await User.findById(sessionUser.id).select('notificationPreferences')
    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 })
    }

    return NextResponse.json({
      preferences: {
        eventReminders: user.notificationPreferences?.eventReminders ?? true,
        taskReminders: user.notificationPreferences?.taskReminders ?? true,
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    return NextResponse.json({ error: 'Không thể tải tùy chọn' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionUser = await requireUser()
    await connectDB()

    const body = await request.json()
    const user = await User.findById(sessionUser.id)
    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 })
    }

    const current = user.notificationPreferences || {
      eventReminders: true,
      taskReminders: true,
    }

    if (typeof body.eventReminders === 'boolean') {
      current.eventReminders = body.eventReminders
    }
    if (typeof body.taskReminders === 'boolean') {
      current.taskReminders = body.taskReminders
    }

    user.notificationPreferences = current
    await user.save()

    return NextResponse.json({
      success: true,
      preferences: {
        eventReminders: current.eventReminders,
        taskReminders: current.taskReminders,
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Preferences error:', error)
    return NextResponse.json({ error: 'Không thể lưu tùy chọn' }, { status: 500 })
  }
}
