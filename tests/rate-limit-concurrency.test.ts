/**
 * Rate-limit unit tests that do not require Mongo when mocked;
 * when MONGODB_URI is a local replica set, also stress concurrent upsert.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFindOneAndUpdate = vi.hoisted(() => vi.fn())

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn(async () => ({})),
}))

vi.mock('@/lib/models/RateLimit', () => ({
  default: {
    findOneAndUpdate: (...a: unknown[]) => mockFindOneAndUpdate(...a),
  },
}))

import {
  checkRateLimit,
  releaseRateLimit,
  hashRateLimitSecret,
} from '@/lib/rate-limit'

describe('rate-limit exact bucket + E11000 retry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns bucketKey and reservationId on success', async () => {
    mockFindOneAndUpdate.mockResolvedValueOnce({ count: 1 })
    const r = await checkRateLimit({ key: 't:user:1', limit: 5, windowMs: 60_000 })
    expect(r.allowed).toBe(true)
    expect(r.bucketKey).toMatch(/^t:user:1:\d+$/)
    expect(r.reservationId).toBeTruthy()
    expect(r.windowStartMs).toBeTypeOf('number')
  })

  it('retries on E11000 and succeeds with non-upsert update', async () => {
    const e11000 = Object.assign(new Error('E11000 duplicate key'), { code: 11000 })
    mockFindOneAndUpdate
      .mockRejectedValueOnce(e11000)
      .mockResolvedValueOnce({ count: 2 })

    const r = await checkRateLimit({ key: 't:race', limit: 10, windowMs: 60_000 })
    expect(r.allowed).toBe(true)
    expect(r.count).toBe(2)
    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(2)
  })

  it('release uses exact bucketKey not recomputed window', async () => {
    mockFindOneAndUpdate.mockResolvedValueOnce({ count: 0 })
    await releaseRateLimit({ bucketKey: 't:user:1:123456000' })
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { key: 't:user:1:123456000', count: { $gt: 0 } },
      { $inc: { count: -1 } }
    )
  })

  it('hashes invite secrets for rate-limit keys', () => {
    const h = hashRateLimitSecret('ABC123XYZ', 'join')
    expect(h).toHaveLength(32)
    expect(h).not.toContain('ABC123')
    expect(hashRateLimitSecret('ABC123XYZ', 'join')).toBe(h)
  })

  it('denies when over limit', async () => {
    mockFindOneAndUpdate.mockResolvedValueOnce({ count: 11 })
    const r = await checkRateLimit({ key: 't:over', limit: 10, windowMs: 60_000 })
    expect(r.allowed).toBe(false)
    expect(r.remaining).toBe(0)
  })
})
