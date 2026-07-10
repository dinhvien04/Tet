import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/lib/models/User'
import {
  AuthError,
  authErrorResponse,
  requireUser,
} from '@/lib/authorization'
import { requireString, optionalString, ValidationError } from '@/lib/api/validate'
import { hashPassword, isValidPassword, verifyPassword } from '@/lib/auth'
import FamilyMember from '@/lib/models/FamilyMember'
import Post from '@/lib/models/Post'
import Reaction from '@/lib/models/Reaction'
import Comment from '@/lib/models/Comment'
import Photo from '@/lib/models/Photo'
import Notification from '@/lib/models/Notification'
import EventRsvp from '@/lib/models/EventRsvp'
import BauCuaWallet from '@/lib/models/BauCuaWallet'
import BauCuaBet from '@/lib/models/BauCuaBet'

export async function GET() {
  try {
    const sessionUser = await requireUser()
    await connectDB()

    const user = await User.findById(sessionUser.id).select(
      '_id email name avatar role provider status createdAt'
    )
    if (!user || user.status === 'deleted') {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 401 })
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar ?? null,
        role: user.role,
        provider: user.provider,
        createdAt: user.createdAt,
        canChangePassword: user.provider === 'credentials',
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error loading profile:', error)
    return NextResponse.json({ error: 'Không thể tải hồ sơ' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionUser = await requireUser()
    await connectDB()

    const user = await User.findById(sessionUser.id)
    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 })
    }

    const body = await request.json()

    if (body.name !== undefined) {
      user.name = requireString(body.name, 'name', { min: 1, max: 100 })
    }

    if (body.avatar !== undefined) {
      const avatar = optionalString(body.avatar, 'avatar', { max: 2000 })
      // Only allow http(s) or empty
      if (avatar && !/^https?:\/\//i.test(avatar)) {
        return NextResponse.json(
          { error: 'Avatar phải là URL http(s)' },
          { status: 400 }
        )
      }
      user.avatar = avatar
    }

    // Password change for credentials users only
    if (body.newPassword) {
      if (user.provider !== 'credentials' || !user.password) {
        return NextResponse.json(
          { error: 'Tài khoản Google không đổi mật khẩu tại đây' },
          { status: 400 }
        )
      }
      if (!body.currentPassword || typeof body.currentPassword !== 'string') {
        return NextResponse.json(
          { error: 'Cần mật khẩu hiện tại' },
          { status: 400 }
        )
      }
      const ok = await verifyPassword(body.currentPassword, user.password)
      if (!ok) {
        return NextResponse.json({ error: 'Mật khẩu hiện tại không đúng' }, { status: 400 })
      }
      const strength = isValidPassword(body.newPassword)
      if (!strength.valid) {
        return NextResponse.json({ error: strength.message }, { status: 400 })
      }
      user.password = await hashPassword(body.newPassword)
    }

    await user.save()

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar ?? null,
        role: user.role,
        provider: user.provider,
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
    console.error('Error updating profile:', error)
    return NextResponse.json({ error: 'Không thể cập nhật hồ sơ' }, { status: 500 })
  }
}

/**
 * DELETE body: { confirm: "XOA TAI KHOAN" | "DELETE" }
 * Soft-delete + anonymize: marks user deleted, bumps sessionVersion (JWT invalid),
 * strips personal data, blocks when sole admin or active game reservations.
 * See docs/DATA_DELETION.md
 */
export async function DELETE(request: NextRequest) {
  try {
    const sessionUser = await requireUser()
    const body = await request.json().catch(() => ({}))
    const confirm = typeof body.confirm === 'string' ? body.confirm.trim().toUpperCase() : ''

    if (confirm !== 'XOA TAI KHOAN' && confirm !== 'DELETE') {
      return NextResponse.json(
        { error: 'Cần xác nhận bằng chuỗi XOA TAI KHOAN hoặc DELETE' },
        { status: 400 }
      )
    }

    await connectDB()

    const user = await User.findById(sessionUser.id)
    if (!user || user.status === 'deleted') {
      // Idempotent
      return NextResponse.json({ success: true, alreadyDeleted: true })
    }

    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({
        role: 'admin',
        status: { $ne: 'deleted' },
      })
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Không thể xóa admin hệ thống cuối cùng' },
          { status: 400 }
        )
      }
    }

    const adminMemberships = await FamilyMember.find({
      userId: user._id,
      role: 'admin',
    })
    for (const m of adminMemberships) {
      const admins = await FamilyMember.countDocuments({
        familyId: m.familyId,
        role: 'admin',
      })
      if (admins <= 1) {
        return NextResponse.json(
          {
            error:
              'Bạn là admin cuối của một nhà. Hãy giao quyền admin cho người khác trước khi xóa tài khoản.',
          },
          { status: 400 }
        )
      }
    }

    // Block active game reservations
    const wallets = await BauCuaWallet.find({ userId: user._id })
    for (const w of wallets) {
      if ((w.reservedBalance || 0) > 0) {
        return NextResponse.json(
          {
            error:
              'Bạn còn điểm đang giữ trong ván Bầu Cua. Hãy đợi ván kết thúc trước khi xóa tài khoản.',
          },
          { status: 400 }
        )
      }
    }

    const BauCuaRound = (await import('@/lib/models/BauCuaRound')).default
    const hosting = await BauCuaRound.findOne({
      hostUserId: user._id,
      status: { $in: ['betting', 'rolling'] },
    })
    if (hosting) {
      return NextResponse.json(
        { error: 'Bạn đang là host của ván Bầu Cua. Hãy kết thúc ván trước.' },
        { status: 400 }
      )
    }

    const uid = user._id
    const now = new Date()

    // Transfer family createdBy to another admin where possible
    const Family = (await import('@/lib/models/Family')).default
    const familiesCreated = await Family.find({ createdBy: uid })
    for (const fam of familiesCreated) {
      const otherAdmin = await FamilyMember.findOne({
        familyId: fam._id,
        role: 'admin',
        userId: { $ne: uid },
      })
      if (otherAdmin) {
        fam.createdBy = otherAdmin.userId
        await fam.save()
      }
    }

    // Soft-delete + anonymize (keep ObjectId for FK integrity)
    user.status = 'deleted'
    user.deletedAt = now
    user.sessionVersion = (user.sessionVersion || 0) + 1
    user.email = `deleted+${uid.toString()}@invalid.local`
    user.name = 'Tài khoản đã xóa'
    user.avatar = undefined
    user.password = undefined
    await user.save()

    await Promise.all([
      FamilyMember.deleteMany({ userId: uid }),
      Reaction.deleteMany({ userId: uid }),
      Comment.deleteMany({ userId: uid }),
      Notification.deleteMany({ userId: uid }),
      EventRsvp.deleteMany({ userId: uid }),
      BauCuaBet.deleteMany({ userId: uid }),
      BauCuaWallet.deleteMany({ userId: uid }),
      Post.deleteMany({ userId: uid }),
      Photo.deleteMany({ userId: uid }),
    ])

    // Cleanup join requests
    const FamilyJoinRequest = (await import('@/lib/models/FamilyJoinRequest')).default
    await FamilyJoinRequest.deleteMany({ userId: uid })

    console.log('[audit] account.deleted', { userId: sessionUser.id })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error deleting account:', error)
    return NextResponse.json({ error: 'Không thể xóa tài khoản' }, { status: 500 })
  }
}
