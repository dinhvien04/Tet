import { connectDB } from '@/lib/mongodb'
import StorageCleanupJob from '@/lib/models/StorageCleanupJob'
import cloudinary from '@/lib/cloudinary'
import { unlink } from 'fs/promises'
import path from 'path'

/**
 * Enqueue a storage cleanup job (idempotent for pending same publicId).
 */
export async function enqueueStorageCleanup(options: {
  type: 'cloudinary' | 'local'
  publicId: string
  userId?: string
  photoId?: string
}): Promise<void> {
  await connectDB()

  const pending = await StorageCleanupJob.findOne({
    publicId: options.publicId,
    status: { $in: ['pending', 'processing'] },
  })
  if (pending) return

  try {
    await StorageCleanupJob.create({
      type: options.type,
      publicId: options.publicId,
      userId: options.userId || null,
      photoId: options.photoId || null,
      attempts: 0,
      status: 'pending',
      nextRetryAt: new Date(),
    })
  } catch (err: unknown) {
    const e = err as { code?: number }
    if (e.code !== 11000) throw err
  }
}

/**
 * Destroy Cloudinary asset; on failure enqueue cleanup job.
 */
export async function destroyCloudinaryOrEnqueue(
  publicId: string,
  meta?: { userId?: string; photoId?: string }
): Promise<{ destroyed: boolean; enqueued: boolean }> {
  if (!publicId || publicId.startsWith('local:')) {
    return { destroyed: false, enqueued: false }
  }

  try {
    await cloudinary.uploader.destroy(publicId)
    return { destroyed: true, enqueued: false }
  } catch (e) {
    console.error('[storage] Cloudinary destroy failed, enqueueing cleanup', e)
    await enqueueStorageCleanup({
      type: 'cloudinary',
      publicId,
      userId: meta?.userId,
      photoId: meta?.photoId,
    })
    return { destroyed: false, enqueued: true }
  }
}

/**
 * Process pending cleanup jobs (for cron / manual).
 */
export async function processStorageCleanupJobs(limit = 20): Promise<{
  processed: number
  completed: number
  failed: number
}> {
  await connectDB()
  const now = new Date()
  const jobs = await StorageCleanupJob.find({
    status: 'pending',
    nextRetryAt: { $lte: now },
  })
    .sort({ nextRetryAt: 1 })
    .limit(limit)

  let completed = 0
  let failed = 0

  for (const job of jobs) {
    job.status = 'processing'
    job.attempts += 1
    await job.save()

    try {
      if (job.type === 'cloudinary') {
        await cloudinary.uploader.destroy(job.publicId)
      } else if (job.publicId.startsWith('local:')) {
        const rel = job.publicId.slice('local:'.length)
        const abs = path.join(process.cwd(), 'public', rel)
        await unlink(abs).catch(() => undefined)
      }
      job.status = 'completed'
      job.lastError = null
      await job.save()
      completed++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      job.lastError = msg.slice(0, 500)
      if (job.attempts >= 10) {
        job.status = 'failed'
        failed++
      } else {
        job.status = 'pending'
        // Exponential backoff: 1m, 2m, 4m...
        const delayMs = Math.min(60_000 * 2 ** (job.attempts - 1), 24 * 60 * 60 * 1000)
        job.nextRetryAt = new Date(Date.now() + delayMs)
        failed++
      }
      await job.save()
    }
  }

  return { processed: jobs.length, completed, failed }
}

export async function countPendingCleanups(): Promise<number> {
  await connectDB()
  return StorageCleanupJob.countDocuments({ status: { $in: ['pending', 'processing'] } })
}
