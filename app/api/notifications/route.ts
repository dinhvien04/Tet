import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import Notification from '@/lib/models/Notification'

// GET unread notifications for current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const notifications = await Notification.find({
      userId: session.user.id,
      read: false,
    })
      .sort({ createdAt: -1 })
      .lean()

    // Format response
    const formattedNotifications = notifications.map((notif) => ({
      id: notif._id.toString(),
      user_id: notif.userId.toString(),
      type: notif.type,
      title: notif.title,
      content: notif.content,
      link: notif.link,
      read: notif.read,
      created_at: notif.createdAt,
    }))

    return NextResponse.json(formattedNotifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// PATCH to mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { notificationId } = await request.json()

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Missing notificationId' },
        { status: 400 }
      )
    }

    await connectDB()

    // Verify notification belongs to user
    const notification = await Notification.findOne({
      _id: notificationId,
      userId: session.user.id,
    })

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    // Mark as read
    await Notification.findByIdAndUpdate(notificationId, { read: true })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    )
  }
}
