import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { AuthError } from '@/lib/authorization'

const mockRequireFamilyMember = vi.hoisted(() => vi.fn())

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
    requireFamilyMember: (...args: unknown[]) => mockRequireFamilyMember(...args),
    authErrorResponse: (error: unknown) => {
      if (error instanceof AuthError) {
        return { error: error.message, status: error.status }
      }
      return { error: 'error', status: 500 }
    },
  }
})

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn(async () => ({})),
}))

const leanChain = (data: unknown) => ({
  sort: () => ({
    limit: () => ({
      select: () => ({
        populate: () => ({
          lean: async () => data,
        }),
        lean: async () => data,
      }),
      lean: async () => data,
    }),
  }),
})

vi.mock('@/lib/models/Post', () => ({
  default: { find: () => leanChain([]) },
}))
vi.mock('@/lib/models/Event', () => ({
  default: { find: () => leanChain([]) },
}))
vi.mock('@/lib/models/Photo', () => ({
  default: { find: () => leanChain([]) },
}))
vi.mock('@/lib/models/EventTask', () => ({
  default: { countDocuments: vi.fn(async () => 2) },
}))
vi.mock('@/lib/models/Notification', () => ({
  default: { countDocuments: vi.fn(async () => 5) },
}))

import { GET } from '@/app/api/dashboard/summary/route'

describe('GET /api/dashboard/summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 without familyId', async () => {
    const req = new NextRequest('http://localhost/api/dashboard/summary')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 401 when not a member', async () => {
    mockRequireFamilyMember.mockRejectedValue(new AuthError('Vui lòng đăng nhập', 401))
    const req = new NextRequest('http://localhost/api/dashboard/summary?familyId=abc')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns summary payload', async () => {
    mockRequireFamilyMember.mockResolvedValue({
      user: { id: 'u1' },
      familyId: 'f1',
    })

    const req = new NextRequest('http://localhost/api/dashboard/summary?familyId=f1')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('recentPosts')
    expect(body).toHaveProperty('upcomingEvents')
    expect(body).toHaveProperty('recentPhotos')
    expect(body.pendingTaskCount).toBe(2)
    expect(body.unreadNotificationCount).toBe(5)
  })
})
