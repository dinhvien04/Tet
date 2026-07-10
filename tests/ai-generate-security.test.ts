import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockRequireUser = vi.hoisted(() => vi.fn())
const mockCheckRateLimit = vi.hoisted(() => vi.fn())
const mockCheckDailyQuota = vi.hoisted(() => vi.fn())

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
}))

import { POST } from '@/app/api/ai/generate/route'
import { AuthError } from '@/lib/authorization'

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
    })
    mockCheckDailyQuota.mockResolvedValue({
      allowed: true,
      remaining: 40,
      retryAfterSeconds: 86400,
    })
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

  it('returns 429 when rate limited', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1', email: 'a@b.c', name: 'A', role: 'user' })
    mockCheckRateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 30,
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
  })

  it('returns content on success', async () => {
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
    const data = await res.json()
    expect(data.content).toBeTruthy()
  })
})
