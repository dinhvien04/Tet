import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Family from '@/lib/models/Family'
import Post from '@/lib/models/Post'
import Event from '@/lib/models/Event'
import Photo from '@/lib/models/Photo'
import {
  getDefaultRoleForEmail,
  isSystemAdminEmail,
  isUserRole,
} from '@/lib/system-admin'
import {
  AuthError,
  authErrorResponse,
  parseObjectId,
  requireSystemAdmin,
} from '@/lib/authorization'
import { parseLimit, DEFAULT_PAGE_LIMIT } from '@/lib/api/pagination'

export async function GET(request: NextRequest) {
  try {
    await requireSystemAdmin()
    await connectDB()

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || searchParams.get('search') || '').trim()
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = parseLimit(searchParams.get('limit'), DEFAULT_PAGE_LIMIT)
    const skip = (page - 1) * limit

    const filter: Record<string, unknown> = {}
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.$or = [
        { email: { $regex: escaped, $options: 'i' } },
        { name: { $regex: escaped, $options: 'i' } },
      ]
    }

    const [users, total, familiesCount, postsCount, eventsCount, photosCount, adminsCount] =
      await Promise.all([
        User.find(filter)
          .select('_id name email avatar provider role createdAt')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(filter),
        Family.countDocuments({}),
        Post.countDocuments({}),
        Event.countDocuments({}),
        Photo.countDocuments({}),
        User.countDocuments({ role: 'admin' }),
      ])

    const formattedUsers = users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar || null,
      provider: user.provider,
      role: user.role || getDefaultRoleForEmail(user.email),
      createdAt: user.createdAt,
    }))

    return NextResponse.json({
      stats: {
        usersCount: total,
        adminsCount,
        familiesCount,
        postsCount,
        eventsCount,
        photosCount,
      },
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error getting admin users:', error)
    return NextResponse.json({ error: 'Không thể tải danh sách user' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireSystemAdmin()
    await connectDB()

    const { userId, role } = await request.json()
    if (!userId || !isUserRole(role)) {
      return NextResponse.json(
        { error: 'Thiếu userId hoặc role không hợp lệ' },
        { status: 400 }
      )
    }

    parseObjectId(userId, 'userId')

    if (admin.id === userId && role !== 'admin') {
      return NextResponse.json(
        { error: 'Không thể tự hạ quyền admin của chính mình' },
        { status: 400 }
      )
    }

    const targetUser = await User.findById(userId)
    if (!targetUser) {
      return NextResponse.json({ error: 'Không tìm thấy user' }, { status: 404 })
    }

    if (role === 'user' && isSystemAdminEmail(targetUser.email)) {
      return NextResponse.json(
        { error: 'User này được cấu hình admin trong SYSTEM_ADMIN_EMAILS' },
        { status: 400 }
      )
    }

    if (role === 'user') {
      const adminCount = await User.countDocuments({ role: 'admin' })
      if (targetUser.role === 'admin' && adminCount <= 1) {
        return NextResponse.json(
          { error: 'Hệ thống phải còn ít nhất một admin' },
          { status: 400 }
        )
      }
    }

    const previousRole = targetUser.role
    targetUser.role = role
    await targetUser.save()

    console.log('[audit] admin.role_change', {
      actorId: admin.id,
      targetUserId: userId,
      from: previousRole,
      to: role,
      at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      user: {
        id: targetUser._id.toString(),
        role: targetUser.role,
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error updating user role:', error)
    return NextResponse.json({ error: 'Không thể cập nhật role' }, { status: 500 })
  }
}
