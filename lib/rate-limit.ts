import { createHash, randomUUID } from 'crypto'
import { connectDB } from '@/lib/mongodb'
import RateLimit from '@/lib/models/RateLimit'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
  count: number
  /** Exact bucket key used for this reservation (use for release). */
  bucketKey: string
  /** Opaque reservation token for idempotent release. */
  reservationId: string
  windowStartMs: number
}

function isDuplicateKeyError(err: unknown): boolean {
  const e = err as { code?: number; message?: string }
  return e?.code === 11000 || /E11000|duplicate key/i.test(e?.message || '')
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Atomic fixed-window rate limit via unique bucket keys + $inc upsert.
 * Key format: `{scope}:{identity}:{windowStartMs}`
 * Handles concurrent first-upsert E11000 with bounded retry.
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
  const expiresAt = new Date(windowStartMs + windowMs + 60_000)
  const reservationId = randomUUID()

  let lastError: unknown
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
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
        bucketKey,
        reservationId,
        windowStartMs,
      }
    } catch (err) {
      lastError = err
      if (isDuplicateKeyError(err)) {
        // Concurrent upsert race — retry without upsert after small jitter
        await sleep(5 + Math.floor(Math.random() * 20))
        try {
          const updated = await RateLimit.findOneAndUpdate(
            { key: bucketKey },
            { $inc: { count: 1 } },
            { new: true }
          )
          if (updated) {
            const count = updated.count
            return {
              allowed: count <= limit,
              remaining: Math.max(0, limit - count),
              retryAfterSeconds: Math.max(
                1,
                Math.ceil((windowStartMs + windowMs - now) / 1000)
              ),
              count,
              bucketKey,
              reservationId,
              windowStartMs,
            }
          }
        } catch {
          // continue outer retry
        }
        continue
      }
      throw err
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Rate limit bucket upsert failed after retries')
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

/**
 * Release one reserved unit from the exact bucket used at reserve time.
 * Never recompute the window from Date.now() — that can cross boundaries.
 */
export async function releaseRateLimit(options: {
  /** Exact bucketKey from checkRateLimit result, preferred. */
  bucketKey?: string
  /** Legacy: base key (will use current window — avoid when possible). */
  key?: string
  windowMs?: number
}): Promise<void> {
  await connectDB()

  let bucketKey = options.bucketKey
  if (!bucketKey) {
    if (!options.key || !options.windowMs) {
      throw new Error('releaseRateLimit requires bucketKey or key+windowMs')
    }
    const now = Date.now()
    const windowStartMs = now - (now % options.windowMs)
    bucketKey = `${options.key}:${windowStartMs}`
  }

  await RateLimit.findOneAndUpdate(
    { key: bucketKey, count: { $gt: 0 } },
    { $inc: { count: -1 } }
  )
}

export async function releaseDailyQuota(options: {
  bucketKey?: string
  key?: string
}): Promise<void> {
  const dayMs = 24 * 60 * 60 * 1000
  if (options.bucketKey) {
    await releaseRateLimit({ bucketKey: options.bucketKey })
    return
  }
  await releaseRateLimit({ key: options.key, windowMs: dayMs })
}

/**
 * Hash a secret (e.g. invite code) for rate-limit keys so raw secrets are not stored.
 */
export function hashRateLimitSecret(secret: string, namespace = 'join'): string {
  const salt = process.env.NEXTAUTH_SECRET || process.env.RATE_LIMIT_HMAC_SECRET || 'tet-connect'
  return createHash('sha256')
    .update(`${namespace}:${salt}:${secret}`)
    .digest('hex')
    .slice(0, 32)
}
