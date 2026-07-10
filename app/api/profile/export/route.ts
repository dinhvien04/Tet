import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/lib/models/User'
import FamilyMember from '@/lib/models/FamilyMember'
import Post from '@/lib/models/Post'
import Comment from '@/lib/models/Comment'
import Photo from '@/lib/models/Photo'
import Notification from '@/lib/models/Notification'
import EventRsvp from '@/lib/models/EventRsvp'
import {
  AuthError,
  authErrorResponse,
  requireUser,
} from '@/lib/authorization'

/**
 * GET — download a basic JSON export of the current user's data (no passwords).
 */
export async function GET() {
  try {
    const sessionUser = await requireUser()
    await connectDB()

    const user = await User.findById(sessionUser.id)
      .select('_id email name avatar role provider notificationPreferences createdAt')
      .lean()

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 })
    }

    const [memberships, posts, comments, photos, notifications, rsvps] =
      await Promise.all([
        FamilyMember.find({ userId: sessionUser.id })
          .select('familyId role joinedAt')
          .lean(),
        Post.find({ userId: sessionUser.id })
          .select('_id familyId content type createdAt')
          .limit(500)
          .lean(),
        Comment.find({ userId: sessionUser.id })
          .select('_id postId content createdAt')
          .limit(500)
          .lean(),
        Photo.find({ userId: sessionUser.id })
          .select('_id familyId url uploadedAt')
          .limit(500)
          .lean(),
        Notification.find({ userId: sessionUser.id })
          .select('type title content link read createdAt')
          .limit(200)
          .lean(),
        EventRsvp.find({ userId: sessionUser.id })
          .select('eventId status updatedAt')
          .limit(200)
          .lean(),
      ])

    const payload = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar ?? null,
        role: user.role,
        provider: user.provider,
        notificationPreferences: user.notificationPreferences || {
          eventReminders: true,
          taskReminders: true,
        },
        createdAt: user.createdAt,
      },
      memberships: memberships.map((m) => ({
        familyId: m.familyId.toString(),
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      posts: posts.map((p) => ({
        id: p._id.toString(),
        familyId: p.familyId.toString(),
        content: p.content,
        type: p.type,
        createdAt: p.createdAt,
      })),
      comments: comments.map((c) => ({
        id: c._id.toString(),
        postId: c.postId.toString(),
        content: c.content,
        createdAt: c.createdAt,
      })),
      photos: photos.map((ph) => ({
        id: ph._id.toString(),
        familyId: ph.familyId.toString(),
        url: ph.url,
        uploadedAt: ph.uploadedAt,
      })),
      notifications: notifications.map((n) => ({
        type: n.type,
        title: n.title,
        content: n.content,
        link: n.link,
        read: n.read,
        createdAt: n.createdAt,
      })),
      rsvps: rsvps.map((r) => ({
        eventId: r.eventId.toString(),
        status: r.status,
        updatedAt: r.updatedAt,
      })),
    }

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="tet-connect-export-${user._id}.json"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Không thể xuất dữ liệu' }, { status: 500 })
  }
}
