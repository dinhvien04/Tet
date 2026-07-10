import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Notification from '@/lib/models/Notification'
import {
  AuthError,
  authErrorResponse,
  parseObjectId,
  requireUser,
} from '@/lib/authorization'
import {
  parseLimit,
  decodeCursor,
  cursorFilter,
  buildNextCursor,
} from '@/lib/api/pagination'
import { getSafeRedirectPath } from '@/lib/safe-redirect'

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    await connectDB()

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') !== 'false'
    const limit = parseLimit(searchParams.get('limit'))
    const cursor = decodeCursor(searchParams.get('cursor'))

    const filter: Record<string, unknown> = {
      userId: user.id,
      ...cursorFilter(cursor, 'createdAt'),
    }
    if (unreadOnly) {
      filter.read = false
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean()

    const nextCursor = buildNextCursor(
      notifications as Array<{ createdAt: Date; _id: { toString(): string } }>,
      limit
    )

    return NextResponse.json({
      notifications: notifications.map((notif) => ({
        id: notif._id.toString(),
        userId: notif.userId.toString(),
        type: notif.type,
        title: notif.title,
        content: notif.content,
        link: notif.link ? getSafeRedirectPath(notif.link, '/dashboard') : null,
        read: notif.read,
        createdAt: notif.createdAt,
      })),
      nextCursor,
      limit,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Không thể tải thông báo' }, { status: 500 })
  }
}

/**
 * PATCH body:
 * - { notificationId } → mark one as read
 * - { markAll: true } → mark all unread as read
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()
    await connectDB()

    if (body.markAll === true) {
      const result = await Notification.updateMany(
        { userId: user.id, read: false },
        { $set: { read: true } }
      )
      return NextResponse.json({
        success: true,
        modifiedCount: result.modifiedCount,
      })
    }

    const notificationId = body.notificationId || body.id
    if (!notificationId) {
      return NextResponse.json(
        { error: 'Thiếu notificationId hoặc markAll' },
        { status: 400 }
      )
    }

    parseObjectId(String(notificationId), 'notificationId')

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId: user.id },
      { $set: { read: true } },
      { new: true }
    )

    if (!notification) {
      return NextResponse.json({ error: 'Không tìm thấy thông báo' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      notification: {
        id: notification._id.toString(),
        read: notification.read,
        link: notification.link
          ? getSafeRedirectPath(notification.link, '/dashboard')
          : null,
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error updating notification:', error)
    return NextResponse.json({ error: 'Không thể cập nhật thông báo' }, { status: 500 })
  }
}
