import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import Event from '@/lib/models/Event'
import Photo from '@/lib/models/Photo'
import EventTask from '@/lib/models/EventTask'
import Notification from '@/lib/models/Notification'
import {
  AuthError,
  authErrorResponse,
  requireFamilyMember,
} from '@/lib/authorization'

export async function GET(request: NextRequest) {
  try {
    const familyId = request.nextUrl.searchParams.get('familyId')
    if (!familyId) {
      return NextResponse.json({ error: 'Thiếu familyId' }, { status: 400 })
    }

    const { user, familyId: familyObjectId } = await requireFamilyMember(familyId)
    await connectDB()

    const now = new Date()

    const [posts, events, photos, pendingTasks, unreadNotifications] = await Promise.all([
      Post.find({ familyId: familyObjectId })
        .sort({ createdAt: -1 })
        .limit(3)
        .select('_id content type createdAt userId')
        .populate('userId', 'name avatar')
        .lean(),
      Event.find({ familyId: familyObjectId, date: { $gte: now } })
        .sort({ date: 1 })
        .limit(3)
        .select('_id title date location createdBy')
        .lean(),
      Photo.find({ familyId: familyObjectId })
        .sort({ uploadedAt: -1 })
        .limit(6)
        .select('_id url uploadedAt userId')
        .lean(),
      EventTask.countDocuments({
        assignedTo: user.id,
        status: 'pending',
      }),
      Notification.countDocuments({
        userId: user.id,
        read: false,
      }),
    ])

    return NextResponse.json({
      recentPosts: posts.map((p) => {
        const author = p.userId as unknown as {
          _id: { toString(): string }
          name: string
          avatar?: string
        }
        return {
          id: p._id.toString(),
          content: p.content,
          type: p.type,
          createdAt: p.createdAt,
          author: author
            ? {
                id: author._id.toString(),
                name: author.name,
                avatar: author.avatar ?? null,
              }
            : null,
        }
      }),
      upcomingEvents: events.map((e) => ({
        id: e._id.toString(),
        title: e.title,
        date: e.date,
        location: e.location ?? null,
      })),
      recentPhotos: photos.map((ph) => ({
        id: ph._id.toString(),
        url: ph.url,
        uploadedAt: ph.uploadedAt,
      })),
      pendingTaskCount: pendingTasks,
      unreadNotificationCount: unreadNotifications,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Dashboard summary error:', error)
    return NextResponse.json({ error: 'Không thể tải tổng quan' }, { status: 500 })
  }
}
