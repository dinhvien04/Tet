import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/lib/models/User'
import {
  AuthError,
  authErrorResponse,
  requireUser,
} from '@/lib/authorization'
import { requireString, ValidationError } from '@/lib/api/validate'
import { hashPassword, isValidPassword, verifyPassword } from '@/lib/auth'
import { validateAvatarUrl } from '@/lib/avatar'

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
      const avatarResult = validateAvatarUrl(body.avatar)
      if (!avatarResult.ok) {
        return NextResponse.json({ error: avatarResult.error }, { status: 400 })
      }
      user.avatar = avatarResult.url ?? undefined
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
 * Soft-delete via production service with transactional cleanup outbox.
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
    const { getOrCreateRequestId } = await import('@/lib/request-id')
    const { deleteUserAccount } = await import('@/lib/services/account/delete-account')
    const { TransactionNotSupportedError } = await import('@/lib/mongo-transaction')
    const requestId = getOrCreateRequestId(request)

    try {
      const result = await deleteUserAccount({
        userId: sessionUser.id,
        requestId,
      })
      const res = NextResponse.json(result)
      res.headers.set('x-request-id', requestId)
      return res
    } catch (error) {
      if (error instanceof AuthError) {
        const { error: message, status } = authErrorResponse(error)
        return NextResponse.json({ error: message }, { status })
      }
      if (error instanceof TransactionNotSupportedError) {
        return NextResponse.json(
          { error: 'Cần MongoDB replica set để xóa tài khoản an toàn' },
          { status: 503 }
        )
      }
      throw error
    }
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error deleting account:', error)
    return NextResponse.json({ error: 'Không thể xóa tài khoản' }, { status: 500 })
  }
}
