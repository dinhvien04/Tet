import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { AuthError } from '@/lib/authorization'

const mockRequireUser = vi.hoisted(() => vi.fn())
const mockFindFamily = vi.hoisted(() => vi.fn())
const mockFindMember = vi.hoisted(() => vi.fn())
const mockFindPending = vi.hoisted(() => vi.fn())
const mockCreateRequest = vi.hoisted(() => vi.fn())
const mockCreateMember = vi.hoisted(() => vi.fn())
const mockRate = vi.hoisted(() => vi.fn())

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
    requireFamilyAdmin: vi.fn(),
    parseObjectId: (v: string) => v,
    authErrorResponse: (error: unknown) => {
      if (error instanceof AuthError) {
        return { error: error.message, status: error.status }
      }
      return { error: 'error', status: 500 }
    },
  }
})

vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn(async () => ({})) }))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...a: unknown[]) => mockRate(...a),
  hashRateLimitSecret: (s: string) => `hash:${s}`,
}))
vi.mock('@/lib/models/Family', () => ({
  default: {
    findById: (...a: unknown[]) => mockFindFamily(...a),
    findOne: (...a: unknown[]) => mockFindFamily(...a),
  },
}))
vi.mock('@/lib/models/FamilyMember', () => ({
  default: {
    findOne: (...a: unknown[]) => mockFindMember(...a),
    create: (...a: unknown[]) => mockCreateMember(...a),
  },
}))
vi.mock('@/lib/models/FamilyJoinRequest', () => ({
  default: {
    findOne: (...a: unknown[]) => mockFindPending(...a),
    create: (...a: unknown[]) => mockCreateRequest(...a),
    updateMany: vi.fn(async () => ({})),
  },
}))

import { POST } from '@/app/api/families/[id]/join/route'

describe('POST /api/families/[id]/join', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRate.mockResolvedValue({
      allowed: true,
      remaining: 5,
      retryAfterSeconds: 60,
      bucketKey: 'join:test:0',
      reservationId: 'r',
      windowStartMs: 0,
      count: 1,
    })
  })

  it('creates pending request when approval required', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1' })
    mockFindFamily.mockResolvedValue({
      _id: { toString: () => 'f1' },
      name: 'Nha A',
      inviteCode: 'ABC12345',
      requireJoinApproval: true,
    })
    mockFindMember.mockResolvedValue(null)
    mockFindPending.mockResolvedValue(null)
    mockCreateRequest.mockResolvedValue({
      _id: { toString: () => 'r1' },
      status: 'pending',
    })

    const req = new NextRequest('http://localhost/api/families/ABC12345/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode: 'ABC12345' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'ABC12345' }) })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.pending).toBe(true)
  })

  it('joins immediately when approval not required', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1' })
    mockFindFamily.mockResolvedValue({
      _id: { toString: () => 'f1' },
      name: 'Nha A',
      inviteCode: 'ABC12345',
      requireJoinApproval: false,
    })
    mockFindMember.mockResolvedValue(null)
    mockFindPending.mockResolvedValue(null)
    mockCreateMember.mockResolvedValue({})

    const req = new NextRequest('http://localhost/api/families/ABC12345/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode: 'ABC12345' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'ABC12345' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.pending).toBe(false)
  })

  it('returns 429 when rate limited', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1' })
    mockRate.mockResolvedValue({ allowed: false, remaining: 0, retryAfterSeconds: 100 })

    const req = new NextRequest('http://localhost/api/families/ABC12345/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode: 'ABC12345' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'ABC12345' }) })
    expect(res.status).toBe(429)
  })
})
