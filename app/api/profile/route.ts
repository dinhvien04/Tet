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
      '_id email name avatar role provider createdAt'
    )
    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 })
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
 * DELETE body: { confirm: "XOA TAI KHOAN" } or { confirm: "DELETE" }
 * Soft-cleans related user data; does not delete families they created (keeps FK integrity).
 */
export async function DELETE(request: NextRequest) {
  try {
    const sessionUser = await requireUser()
    const body = await request.json().catch(() => ({}))
    const confirm = typeof body.confirm === 'string' ? body.confirm.trim().toUpperCase() : ''

    if (confirm !== 'XOA TAI KHOAN' && confirm !== 'DELETE') {
      return NextResponse.json(
        {
          error: 'Cần xác nhận bằng chuỗi XOA TAI KHOAN hoặc DELETE',
        },
        { status: 400 }
      )
    }

    await connectDB()

    const user = await User.findById(sessionUser.id)
    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 })
    }

    // Block if sole system admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' })
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Không thể xóa admin hệ thống cuối cùng' },
          { status: 400 }
        )
      }
    }

    // Block if sole family admin in any family
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

    const uid = user._id

    await Promise.all([
      FamilyMember.deleteMany({ userId: uid }),
      Reaction.deleteMany({ userId: uid }),
      Comment.deleteMany({ userId: uid }),
      Notification.deleteMany({ userId: uid }),
      EventRsvp.deleteMany({ userId: uid }),
      BauCuaBet.deleteMany({ userId: uid }),
      BauCuaWallet.deleteMany({ userId: uid }),
      // Keep posts/photos as historical content but strip? Or delete:
      Post.deleteMany({ userId: uid }),
      Photo.deleteMany({ userId: uid }),
    ])

    await User.deleteOne({ _id: uid })

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
