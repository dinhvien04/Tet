import { randomUUID } from 'crypto'
import type { ClientSession } from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import StorageCleanupJob from '@/lib/models/StorageCleanupJob'
import cloudinary from '@/lib/cloudinary'
import { unlink } from 'fs/promises'
import path from 'path'

const LEASE_MS = 60_000
const MAX_ATTEMPTS = 10

export function buildCleanupIdempotencyKey(
  scope: 'account-delete' | 'photo-delete' | 'upload-rollback',
  id: string,
  publicId: string
): string {
  return `${scope}:${id}:${publicId}`
}

/**
 * Enqueue cleanup job — pass session for transactional outbox.
 * Unique on idempotencyKey (retry-safe).
 */
export async function enqueueStorageCleanup(options: {
  type: 'cloudinary' | 'local'
  publicId: string
  idempotencyKey: string
  userId?: string
  photoId?: string
  session?: ClientSession
}): Promise<void> {
  await connectDB()
  const opt = options.session ? { session: options.session } : {}

  try {
    await StorageCleanupJob.create(
      [
        {
          idempotencyKey: options.idempotencyKey,
          type: options.type,
          publicId: options.publicId,
          userId: options.userId || null,
          photoId: options.photoId || null,
          attempts: 0,
          status: 'pending',
          nextRetryAt: new Date(),
        },
      ],
      options.session ? { session: options.session } : undefined
    )
  } catch (err: unknown) {
    const e = err as { code?: number }
    if (e.code === 11000) {
      // Already enqueued — idempotent success
      return
    }
    throw err
  }
  void opt
}

export async function destroyCloudinaryOrEnqueue(
  publicId: string,
  meta?: {
    userId?: string
    photoId?: string
    idempotencyKey?: string
  }
): Promise<{ destroyed: boolean; enqueued: boolean }> {
  if (!publicId || publicId.startsWith('local:')) {
    return { destroyed: false, enqueued: false }
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId)
    // not found is ok (idempotent)
    void result
    return { destroyed: true, enqueued: false }
  } catch (e) {
    console.error('[storage] Cloudinary destroy failed, enqueueing cleanup', e)
    await enqueueStorageCleanup({
      type: 'cloudinary',
      publicId,
      idempotencyKey:
        meta?.idempotencyKey ||
        buildCleanupIdempotencyKey(
          'upload-rollback',
          meta?.photoId || meta?.userId || 'unknown',
          publicId
        ),
      userId: meta?.userId,
      photoId: meta?.photoId,
    })
    return { destroyed: false, enqueued: true }
  }
}

/** Resolve local path under public/uploads only — reject traversal. */
export function resolveSafeLocalCleanupPath(publicId: string): string {
  if (!publicId.startsWith('local:')) {
    throw new Error('Not a local publicId')
  }
  const rel = publicId.slice('local:'.length).replace(/\\/g, '/')
  if (
    !rel ||
    rel.includes('\0') ||
    path.isAbsolute(rel) ||
    rel.split('/').some((p) => p === '..')
  ) {
    throw new Error('Invalid local cleanup path')
  }
  const base = path.resolve(process.cwd(), 'public', 'uploads')
  const abs = path.resolve(process.cwd(), 'public', rel)
  if (!abs.startsWith(base + path.sep) && abs !== base) {
    throw new Error('Local cleanup path escapes uploads root')
  }
  return abs
}

async function claimNextJob(): Promise<InstanceType<typeof StorageCleanupJob> | null> {
  const now = new Date()
  const leaseId = randomUUID()
  const leaseExpiresAt = new Date(now.getTime() + LEASE_MS)

  return StorageCleanupJob.findOneAndUpdate(
    {
      $or: [
        { status: 'pending', nextRetryAt: { $lte: now } },
        { status: 'processing', leaseExpiresAt: { $lt: now } },
      ],
    },
    {
      $set: {
        status: 'processing',
        leaseId,
        leaseExpiresAt,
        processingStartedAt: now,
      },
      $inc: { attempts: 1 },
    },
    { sort: { nextRetryAt: 1 }, new: true }
  )
}

async function completeJob(
  jobId: string,
  leaseId: string,
  ok: boolean,
  lastError?: string
): Promise<void> {
  if (ok) {
    await StorageCleanupJob.findOneAndUpdate(
      { _id: jobId, leaseId, status: 'processing' },
      {
        $set: {
          status: 'completed',
          lastError: null,
          leaseId: null,
          leaseExpiresAt: null,
        },
      }
    )
    return
  }

  const job = await StorageCleanupJob.findOne({ _id: jobId, leaseId, status: 'processing' })
  if (!job) return

  const attempts = job.attempts
  if (attempts >= MAX_ATTEMPTS) {
    await StorageCleanupJob.findOneAndUpdate(
      { _id: jobId, leaseId, status: 'processing' },
      {
        $set: {
          status: 'failed',
          lastError: lastError?.slice(0, 500) || 'max attempts',
          leaseId: null,
          leaseExpiresAt: null,
        },
      }
    )
  } else {
    const delayMs = Math.min(60_000 * 2 ** Math.max(0, attempts - 1), 24 * 60 * 60 * 1000)
    await StorageCleanupJob.findOneAndUpdate(
      { _id: jobId, leaseId, status: 'processing' },
      {
        $set: {
          status: 'pending',
          lastError: lastError?.slice(0, 500) || null,
          nextRetryAt: new Date(Date.now() + delayMs),
          leaseId: null,
          leaseExpiresAt: null,
        },
      }
    )
  }
}

/**
 * Process pending cleanup jobs with atomic claim + lease.
 */
export async function processStorageCleanupJobs(limit = 20): Promise<{
  processed: number
  completed: number
  failed: number
}> {
  await connectDB()
  let processed = 0
  let completed = 0
  let failed = 0

  for (let i = 0; i < limit; i++) {
    const job = await claimNextJob()
    if (!job) break
    processed++
    const leaseId = job.leaseId!
    try {
      if (job.type === 'cloudinary') {
        try {
          await cloudinary.uploader.destroy(job.publicId)
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          // not found → idempotent complete
          if (/not found|http code: 404/i.test(msg)) {
            await completeJob(job._id.toString(), leaseId, true)
            completed++
            continue
          }
          throw e
        }
      } else {
        const abs = resolveSafeLocalCleanupPath(job.publicId)
        await unlink(abs).catch(() => undefined)
      }
      await completeJob(job._id.toString(), leaseId, true)
      completed++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      await completeJob(job._id.toString(), leaseId, false, msg)
      failed++
    }
  }

  return { processed, completed, failed }
}

export async function countPendingCleanups(): Promise<number> {
  await connectDB()
  return StorageCleanupJob.countDocuments({
    status: { $in: ['pending', 'processing'] },
  })
}
