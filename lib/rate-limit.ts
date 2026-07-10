import { connectDB } from '@/lib/mongodb'
import RateLimit from '@/lib/models/RateLimit'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

/**
 * MongoDB-backed fixed-window rate limiter (serverless-safe).
 */
export async function checkRateLimit(options: {
  key: string
  limit: number
  windowMs: number
}): Promise<RateLimitResult> {
  const { key, limit, windowMs } = options
  await connectDB()

  const now = new Date()
  const windowStart = new Date(now.getTime() - (now.getTime() % windowMs))
  const expiresAt = new Date(windowStart.getTime() + windowMs)

  const existing = await RateLimit.findOne({ key })

  if (!existing || existing.windowStart.getTime() < windowStart.getTime()) {
    await RateLimit.findOneAndUpdate(
      { key },
      {
        $set: {
          count: 1,
          windowStart,
          expiresAt,
        },
      },
      { upsert: true, new: true }
    )

    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    }
  }

  if (existing.count >= limit) {
    const retryAfterMs = existing.expiresAt.getTime() - now.getTime()
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    }
  }

  const updated = await RateLimit.findOneAndUpdate(
    { key, count: { $lt: limit }, windowStart: existing.windowStart },
    { $inc: { count: 1 } },
    { new: true }
  )

  if (!updated) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.expiresAt.getTime() - now.getTime()) / 1000)
      ),
    }
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - updated.count),
    retryAfterSeconds: Math.ceil(windowMs / 1000),
  }
}

export async function checkDailyQuota(options: {
  key: string
  limit: number
}): Promise<RateLimitResult> {
  const dayMs = 24 * 60 * 60 * 1000
  return checkRateLimit({
    key: options.key,
    limit: options.limit,
    windowMs: dayMs,
  })
}
