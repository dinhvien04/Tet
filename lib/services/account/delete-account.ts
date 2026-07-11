import User from '@/lib/models/User'
import FamilyMember from '@/lib/models/FamilyMember'
import Post from '@/lib/models/Post'
import Reaction from '@/lib/models/Reaction'
import Comment from '@/lib/models/Comment'
import Photo from '@/lib/models/Photo'
import Notification from '@/lib/models/Notification'
import EventRsvp from '@/lib/models/EventRsvp'
import BauCuaWallet from '@/lib/models/BauCuaWallet'
import BauCuaBet from '@/lib/models/BauCuaBet'
import BauCuaRound from '@/lib/models/BauCuaRound'
import Family from '@/lib/models/Family'
import FamilyJoinRequest from '@/lib/models/FamilyJoinRequest'
import StorageCleanupJob from '@/lib/models/StorageCleanupJob'
import AuditEvent from '@/lib/models/AuditEvent'
import {
  casDecrementFamilyAdmin,
  casDecrementSystemAdmin,
} from '@/lib/admin-invariant'
import {
  TransactionNotSupportedError,
  withMongoTransaction,
} from '@/lib/mongo-transaction'
import {
  buildCleanupIdempotencyKey,
  enqueueStorageCleanup,
} from '@/lib/storage-cleanup'
import { AuthError } from '@/lib/authorization'

export interface DeleteAccountResult {
  success: true
  alreadyDeleted?: boolean
  cleanupPending: boolean
}

/**
 * Soft-delete account with transactional outbox for storage cleanup.
 */
export async function deleteUserAccount(options: {
  userId: string
  requestId?: string | null
}): Promise<DeleteAccountResult> {
  const { userId, requestId } = options

  const existing = await User.findById(userId)
  if (!existing || existing.status === 'deleted') {
    const pendingCleanups = await StorageCleanupJob.countDocuments({
      userId,
      status: { $in: ['pending', 'processing'] },
    })
    return {
      success: true,
      alreadyDeleted: true,
      cleanupPending: pendingCleanups > 0,
    }
  }

  let cleanupCount = 0

  try {
    await withMongoTransaction(
      async (session) => {
        const opt = session ? { session } : {}
        const user = await User.findById(userId, null, opt)
        if (!user || user.status === 'deleted') {
          return
        }

        if (user.role === 'admin') {
          const ok = await casDecrementSystemAdmin(session)
          if (!ok) {
            throw new AuthError('Không thể xóa admin hệ thống cuối cùng', 400)
          }
        }

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

        // Transactional outbox: create cleanup jobs BEFORE deleting photo metadata
        const photos = await Photo.find({ userId: uid }, 'publicId', opt)
        cleanupCount = 0
        for (const p of photos) {
          if (!p.publicId) continue
          const type = p.publicId.startsWith('local:') ? 'local' : 'cloudinary'
          await enqueueStorageCleanup({
            type,
            publicId: p.publicId,
            idempotencyKey: buildCleanupIdempotencyKey(
              'account-delete',
              uid.toString(),
              p.publicId
            ),
            userId: uid.toString(),
            photoId: p._id.toString(),
            session,
          })
          cleanupCount++
        }

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

        // Durable audit inside same transaction
        await AuditEvent.create(
          [
            {
              actorId: uid,
              action: 'account.deleted',
              targetType: 'user',
              targetId: uid.toString(),
              metadata: { cleanupJobs: cleanupCount },
              requestId: requestId || null,
              createdAt: now,
            },
          ],
          session ? { session } : undefined
        )
      },
      { requireReplicaSet: true }
    )
  } catch (error) {
    if (error instanceof AuthError || error instanceof TransactionNotSupportedError) {
      throw error
    }
    throw error
  }

  return {
    success: true,
    cleanupPending: cleanupCount > 0,
  }
}
