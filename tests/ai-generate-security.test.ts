import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockRequireUser = vi.hoisted(() => vi.fn())
const mockCheckRateLimit = vi.hoisted(() => vi.fn())
const mockCheckDailyQuota = vi.hoisted(() => vi.fn())
const mockReleaseDailyQuota = vi.hoisted(() => vi.fn())
const mockReleaseRateLimit = vi.hoisted(() => vi.fn())

vi.mock('@/lib/authorization', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
      this.name = 'AuthError'
    }
  }

  return {
    AuthError,
    requireUser: () => mockRequireUser(),
    authErrorResponse: (error: unknown) => {
      if (error instanceof AuthError) {
        return { error: error.message, status: error.status }
      }
      return { error: 'Có lỗi xảy ra', status: 500 }
    },
  }
})

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  checkDailyQuota: (...args: unknown[]) => mockCheckDailyQuota(...args),
  releaseDailyQuota: (...args: unknown[]) => mockReleaseDailyQuota(...args),
  releaseRateLimit: (...args: unknown[]) => mockReleaseRateLimit(...args),
}))

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn(async () => ({})),
}))

import { POST } from '@/app/api/ai/generate/route'
import { AuthError } from '@/lib/authorization'

function quotaOk(count = 1) {
  return {
    allowed: true,
    remaining: 49,
    retryAfterSeconds: 86400,
    count,
    bucketKey: 'ai:success:u1:0',
    reservationId: 'res-1',
    windowStartMs: 0,
  }
}

describe('POST /api/ai/generate security', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.MEGALLM_API_KEY = 'test-key'
    process.env.MEGALLM_MODEL = 'test-model'
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 5,
      retryAfterSeconds: 60,
      count: 1,
      bucketKey: 'ai:user:u1:0',
      reservationId: 'r1',
      windowStartMs: 0,
    })
    mockCheckDailyQuota.mockResolvedValue(quotaOk())
    mockReleaseDailyQuota.mockResolvedValue(undefined)
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: 'Chúc mừng năm mới' } }],
          usage: { total_tokens: 10 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    ) as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('returns 401 when not logged in', async () => {
    mockRequireUser.mockRejectedValue(new AuthError('Vui lòng đăng nhập', 401))

    const req = new NextRequest('http://localhost/api/ai/generate', {
      method: 'POST',
      body: JSON.stringify({
        type: 'loi-chuc',
        recipientName: 'Ba',
        traits: 'hien lanh',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid type', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1', email: 'a@b.c', name: 'A', role: 'user' })

    const req = new NextRequest('http://localhost/api/ai/generate', {
      method: 'POST',
      body: JSON.stringify({
        type: 'invalid',
        recipientName: 'Ba',
        traits: 'hien lanh',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when recipientName too long', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1', email: 'a@b.c', name: 'A', role: 'user' })

    const req = new NextRequest('http://localhost/api/ai/generate', {
      method: 'POST',
      body: JSON.stringify({
        type: 'loi-chuc',
        recipientName: 'x'.repeat(101),
        traits: 'hien lanh',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 429 when rate limited before provider', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1', email: 'a@b.c', name: 'A', role: 'user' })
    mockCheckRateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 30,
      count: 11,
      bucketKey: 'ai:user:u1:0',
      reservationId: 'r',
      windowStartMs: 0,
    })

    const req = new NextRequest('http://localhost/api/ai/generate', {
      method: 'POST',
      body: JSON.stringify({
        type: 'loi-chuc',
        recipientName: 'Ba',
        traits: 'hien lanh',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('30')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('reserves daily quota before provider and does not call provider when over quota', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1', email: 'a@b.c', name: 'A', role: 'user' })
    mockCheckDailyQuota.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 100,
      count: 51,
      bucketKey: 'ai:success:u1:0',
      reservationId: 'r',
      windowStartMs: 0,
    })

    const req = new NextRequest('http://localhost/api/ai/generate', {
      method: 'POST',
      body: JSON.stringify({
        type: 'loi-chuc',
        recipientName: 'Ba',
        traits: 'hien lanh',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(429)
    expect(global.fetch).not.toHaveBeenCalled()
    expect(mockReleaseDailyQuota).toHaveBeenCalledWith({
      bucketKey: 'ai:success:u1:0',
    })
  })

  it('releases daily reservation when provider fails', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1', email: 'a@b.c', name: 'A', role: 'user' })
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'fail' }), { status: 502 })
    ) as typeof fetch

    const req = new NextRequest('http://localhost/api/ai/generate', {
      method: 'POST',
      body: JSON.stringify({
        type: 'loi-chuc',
        recipientName: 'Ba',
        traits: 'hien lanh',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(502)
    expect(mockReleaseDailyQuota).toHaveBeenCalledWith({
      bucketKey: 'ai:success:u1:0',
    })
  })

  it('keeps reservation on success and returns content', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1', email: 'a@b.c', name: 'A', role: 'user' })

    const req = new NextRequest('http://localhost/api/ai/generate', {
      method: 'POST',
      body: JSON.stringify({
        type: 'loi-chuc',
        recipientName: 'Ba',
        traits: 'hien lanh',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.content).toContain('Chúc mừng')
    // reservation kept (no release on success)
    expect(mockReleaseDailyQuota).not.toHaveBeenCalled()
  })
})
