import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { AuthError } from '@/lib/authorization'

const mockRequireUser = vi.hoisted(() => vi.fn())
const mockRate = vi.hoisted(() =>
  vi.fn(async () => ({ allowed: true, remaining: 5, retryAfterSeconds: 60, count: 1 }))
)

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
      return { error: 'error', status: 500 }
    },
  }
})

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...a: unknown[]) => mockRate(...a),
}))

vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn(async () => ({})) }))
vi.mock('@/lib/invite', () => ({
  isInviteValid: () => ({ valid: true }),
}))
vi.mock('@/lib/models/Family', () => ({
  default: { findOne: vi.fn(), findById: vi.fn() },
}))
vi.mock('@/lib/models/FamilyMember', () => ({
  default: { findOne: vi.fn(), create: vi.fn() },
}))
vi.mock('@/lib/models/FamilyJoinRequest', () => ({
  default: { findOne: vi.fn(), create: vi.fn() },
}))

import { POST } from '@/app/api/families/[id]/join/route'

describe('join requires inviteCode secret', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireUser.mockResolvedValue({ id: 'u1' })
  })

  it('rejects join with only ObjectId path and no inviteCode body', async () => {
    const req = new NextRequest('http://localhost/api/families/507f1f77bcf86cd799439011/join', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req, {
      params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/inviteCode/i)
  })
})
