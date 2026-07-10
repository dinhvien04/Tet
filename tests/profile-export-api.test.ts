import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthError } from '@/lib/authorization'

const mockRequireUser = vi.hoisted(() => vi.fn())
const mockFindById = vi.hoisted(() => vi.fn())
const mockLeanFind = vi.hoisted(() => vi.fn(async () => []))

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

vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn(async () => ({})) }))
vi.mock('@/lib/models/User', () => ({
  default: {
    findById: () => ({
      select: () => ({
        lean: () => mockFindById(),
      }),
    }),
  },
}))

const emptyChain = {
  select: () => ({
    lean: mockLeanFind,
    limit: () => ({ lean: mockLeanFind }),
  }),
  limit: () => ({ lean: mockLeanFind }),
  lean: mockLeanFind,
}

vi.mock('@/lib/models/FamilyMember', () => ({
  default: { find: () => emptyChain },
}))
vi.mock('@/lib/models/Post', () => ({ default: { find: () => emptyChain } }))
vi.mock('@/lib/models/Comment', () => ({ default: { find: () => emptyChain } }))
vi.mock('@/lib/models/Photo', () => ({ default: { find: () => emptyChain } }))
vi.mock('@/lib/models/Notification', () => ({ default: { find: () => emptyChain } }))
vi.mock('@/lib/models/EventRsvp', () => ({ default: { find: () => emptyChain } }))

import { GET } from '@/app/api/profile/export/route'

describe('GET /api/profile/export', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requires auth', async () => {
    mockRequireUser.mockRejectedValue(new AuthError('Vui lòng đăng nhập', 401))
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns downloadable JSON', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1' })
    mockFindById.mockResolvedValue({
      _id: { toString: () => 'u1' },
      email: 'a@b.c',
      name: 'An',
      avatar: null,
      role: 'user',
      provider: 'credentials',
      notificationPreferences: { eventReminders: true, taskReminders: false },
      createdAt: new Date(),
    })

    const res = await GET()
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('application/json')
    const text = await res.text()
    const data = JSON.parse(text)
    expect(data.user.email).toBe('a@b.c')
    expect(data).toHaveProperty('posts')
  })
})
