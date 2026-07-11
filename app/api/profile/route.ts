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
 * Soft-delete + anonymize inside a Mongo transaction; Cloudinary cleanup via outbox.
 * Password only required when provider=credentials AND status=active.
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

    const {
      withMongoTransaction,
      TransactionNotSupportedError,
    } = await import('@/lib/mongo-transaction')
    const {
      casDecrementFamilyAdmin,
      casDecrementSystemAdmin,
    } = await import('@/lib/admin-invariant')
    const { enqueueStorageCleanup } = await import('@/lib/storage-cleanup')
    const Family = (await import('@/lib/models/Family')).default
    const FamilyJoinRequest = (await import('@/lib/models/FamilyJoinRequest')).default
    const BauCuaRound = (await import('@/lib/models/BauCuaRound')).default

    // Pre-check for already deleted (idempotent)
    const existing = await User.findById(sessionUser.id)
    if (!existing || existing.status === 'deleted') {
      const pendingCleanups = await (
        await import('@/lib/models/StorageCleanupJob')
      ).default.countDocuments({
        userId: sessionUser.id,
        status: { $in: ['pending', 'processing'] },
      })
      return NextResponse.json({
        success: true,
        alreadyDeleted: true,
        cleanupPending: pendingCleanups > 0,
      })
    }

    let photoPublicIds: Array<{ publicId: string; photoId: string }> = []

    try {
      await withMongoTransaction(
        async (session) => {
          const opt = session ? { session } : {}
          const user = await User.findById(sessionUser.id, null, opt)
          if (!user || user.status === 'deleted') {
            return
          }

          // System admin invariant
          if (user.role === 'admin') {
            const ok = await casDecrementSystemAdmin(session)
            if (!ok) {
              throw new AuthError('Không thể xóa admin hệ thống cuối cùng', 400)
            }
          }

          // Family admin invariant for each admin membership
          const adminMemberships = await FamilyMember.find(
            { userId: user._id, role: 'admin' },
            null,
            opt
          )
          for (const m of adminMemberships) {
            const ok = await casDecrementFamilyAdmin(m.familyId, session)
            if (!ok) {
              throw new AuthError(
                'Bạn là admin cuối của một nhà. Hãy giao quyền admin cho người khác trước khi xóa tài khoản.',
                400
              )
            }
          }

          // Block active game reservations
          const wallets = await BauCuaWallet.find({ userId: user._id }, null, opt)
          for (const w of wallets) {
            if ((w.reservedBalance || 0) > 0) {
              throw new AuthError(
                'Bạn còn điểm đang giữ trong ván Bầu Cua. Hãy đợi ván kết thúc trước khi xóa tài khoản.',
                400
              )
            }
          }

          const hosting = await BauCuaRound.findOne(
            {
              hostUserId: user._id,
              status: { $in: ['betting', 'rolling'] },
            },
            null,
            opt
          )
          if (hosting) {
            throw new AuthError(
              'Bạn đang là host của ván Bầu Cua. Hãy kết thúc ván trước.',
              400
            )
          }

          const uid = user._id
          const now = new Date()

          // Transfer family createdBy
          const familiesCreated = await Family.find({ createdBy: uid }, null, opt)
          for (const fam of familiesCreated) {
            const otherAdmin = await FamilyMember.findOne(
              {
                familyId: fam._id,
                role: 'admin',
                userId: { $ne: uid },
              },
              null,
              opt
            )
            if (otherAdmin) {
              fam.createdBy = otherAdmin.userId
              await fam.save(opt)
            }
          }

          // Collect photo publicIds before delete for cleanup outbox
          const photos = await Photo.find({ userId: uid }, 'publicId', opt)
          photoPublicIds = photos
            .filter((p) => p.publicId)
            .map((p) => ({
              publicId: p.publicId!,
              photoId: p._id.toString(),
            }))

          // Soft-delete + anonymize (password optional when status=deleted)
          user.status = 'deleted'
          user.deletedAt = now
          user.sessionVersion = (user.sessionVersion || 0) + 1
          user.email = `deleted+${uid.toString()}@invalid.local`
          user.name = 'Tài khoản đã xóa'
          user.avatar = undefined
          user.password = undefined
          await user.save(opt)

          await FamilyMember.deleteMany({ userId: uid }, opt)
          await Reaction.deleteMany({ userId: uid }, opt)
          await Comment.deleteMany({ userId: uid }, opt)
          await Notification.deleteMany({ userId: uid }, opt)
          await EventRsvp.deleteMany({ userId: uid }, opt)
          await BauCuaBet.deleteMany({ userId: uid }, opt)
          await BauCuaWallet.deleteMany({ userId: uid }, opt)
          await Post.deleteMany({ userId: uid }, opt)
          await Photo.deleteMany({ userId: uid }, opt)
          await FamilyJoinRequest.deleteMany({ userId: uid }, opt)
        },
        { requireReplicaSet: true }
      )
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

    // Outbox: Cloudinary cleanup after DB commit
    for (const p of photoPublicIds) {
      if (p.publicId.startsWith('local:')) {
        await enqueueStorageCleanup({
          type: 'local',
          publicId: p.publicId,
          userId: sessionUser.id,
          photoId: p.photoId,
        })
      } else {
        await enqueueStorageCleanup({
          type: 'cloudinary',
          publicId: p.publicId,
          userId: sessionUser.id,
          photoId: p.photoId,
        })
      }
    }

    const { writeAuditEvent } = await import('@/lib/audit')
    await writeAuditEvent({
      actorId: sessionUser.id,
      action: 'account.deleted',
      targetType: 'user',
      targetId: sessionUser.id,
      metadata: { cleanupJobs: photoPublicIds.length },
    })

    return NextResponse.json({
      success: true,
      cleanupPending: photoPublicIds.length > 0,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const { error: message, status } = authErrorResponse(error)
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Error deleting account:', error)
    return NextResponse.json({ error: 'Không thể xóa tài khoản' }, { status: 500 })
  }
}
