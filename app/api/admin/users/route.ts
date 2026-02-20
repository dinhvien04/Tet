import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Family from '@/lib/models/Family'
import Post from '@/lib/models/Post'
import Event from '@/lib/models/Event'
import Photo from '@/lib/models/Photo'
import { getDefaultRoleForEmail, isSystemAdminEmail, isUserRole } from '@/lib/system-admin'

async function requireSystemAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Vui long dang nhap' }, { status: 401 }) }
  }

  await connectDB()

  const currentUser = await User.findById(session.user.id).select('_id email role')
  if (!currentUser) {
    return { error: NextResponse.json({ error: 'Khong tim thay tai khoan' }, { status: 404 }) }
  }

  const resolvedRole = currentUser.role || getDefaultRoleForEmail(currentUser.email)
  if (currentUser.role !== resolvedRole) {
    currentUser.role = resolvedRole
    await currentUser.save()
  }

  if (resolvedRole !== 'admin') {
    return { error: NextResponse.json({ error: 'Ban khong co quyen admin' }, { status: 403 }) }
  }

  return { currentUser }
}

export async function GET() {
  try {
    const auth = await requireSystemAdmin()
    if ('error' in auth) {
      return auth.error
    }

    const [users, familiesCount, postsCount, eventsCount, photosCount] = await Promise.all([
      User.find({})
        .select('_id name email avatar provider role createdAt')
        .sort({ createdAt: -1 })
        .lean(),
      Family.countDocuments({}),
      Post.countDocuments({}),
      Event.countDocuments({}),
      Photo.countDocuments({}),
    ])

    const formattedUsers = users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar || null,
      provider: user.provider,
      role: user.role || getDefaultRoleForEmail(user.email),
      created_at: user.createdAt,
    }))

    const adminsCount = formattedUsers.filter((user) => user.role === 'admin').length

    return NextResponse.json({
      stats: {
        users_count: formattedUsers.length,
        admins_count: adminsCount,
        families_count: familiesCount,
        posts_count: postsCount,
        events_count: eventsCount,
        photos_count: photosCount,
      },
      users: formattedUsers,
    })
  } catch (error) {
    console.error('Error getting admin users:', error)
    return NextResponse.json({ error: 'Khong the tai danh sach user' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireSystemAdmin()
    if ('error' in auth) {
      return auth.error
    }

    const { userId, role } = await request.json()
    if (!userId || !isUserRole(role)) {
      return NextResponse.json(
        { error: 'Thieu userId hoac role khong hop le' },
        { status: 400 }
      )
    }

    if (auth.currentUser._id.toString() === userId && role !== 'admin') {
      return NextResponse.json(
        { error: 'Khong the tu ha quyen admin cua chinh minh' },
        { status: 400 }
      )
    }

    const targetUser = await User.findById(userId)
    if (!targetUser) {
      return NextResponse.json({ error: 'Khong tim thay user' }, { status: 404 })
    }

    const currentRole = targetUser.role || getDefaultRoleForEmail(targetUser.email)
    if (targetUser.role !== currentRole) {
      targetUser.role = currentRole
      await targetUser.save()
    }

    if (role === 'user' && isSystemAdminEmail(targetUser.email)) {
      return NextResponse.json(
        { error: 'User nay duoc cau hinh admin trong SYSTEM_ADMIN_EMAILS' },
        { status: 400 }
      )
    }

    if (currentRole === 'admin' && role === 'user') {
      const adminsCount = await User.countDocuments({ role: 'admin' })
      if (adminsCount <= 1) {
        return NextResponse.json(
          { error: 'He thong phai co it nhat 1 admin' },
          { status: 400 }
        )
      }
    }

    targetUser.role = role
    await targetUser.save()

    return NextResponse.json({
      success: true,
      user: {
        id: targetUser._id.toString(),
        name: targetUser.name,
        email: targetUser.email,
        avatar: targetUser.avatar || null,
        provider: targetUser.provider,
        role: targetUser.role,
        created_at: targetUser.createdAt,
      },
    })
  } catch (error) {
    console.error('Error updating user role:', error)
    return NextResponse.json({ error: 'Khong the cap nhat quyen user' }, { status: 500 })
  }
}
