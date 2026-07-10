import { connectDB } from '@/lib/mongodb'
import RateLimit from '@/lib/models/RateLimit'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
  count: number
}

/**
 * Atomic fixed-window rate limit via unique bucket keys + $inc upsert.
 * Key format: `{scope}:{identity}:{windowStartMs}`
 * No read-before-write race on window reset.
 */
export async function checkRateLimit(options: {
  key: string
  limit: number
  windowMs: number
}): Promise<RateLimitResult> {
  const { key: baseKey, limit, windowMs } = options
  await connectDB()

  const now = Date.now()
  const windowStartMs = now - (now % windowMs)
  const bucketKey = `${baseKey}:${windowStartMs}`
  const expiresAt = new Date(windowStartMs + windowMs + 60_000) // grace for TTL

  const updated = await RateLimit.findOneAndUpdate(
    { key: bucketKey },
    {
      $inc: { count: 1 },
      $setOnInsert: {
        windowStart: new Date(windowStartMs),
        expiresAt,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  )

  const count = updated?.count ?? 1
  const allowed = count <= limit
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((windowStartMs + windowMs - now) / 1000)
  )

  return {
    allowed,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds,
    count,
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
