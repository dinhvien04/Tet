import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { AuthError } from '@/lib/authorization'

const mockRequireUser = vi.hoisted(() => vi.fn())
const mockFindById = vi.hoisted(() => vi.fn())

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
    findById: (...a: unknown[]) => mockFindById(...a),
  },
}))

import { GET, PATCH } from '@/app/api/profile/route'

describe('/api/profile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('GET returns 401 when not logged in', async () => {
    mockRequireUser.mockRejectedValue(new AuthError('Vui lòng đăng nhập', 401))
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('GET returns profile', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1' })
    mockFindById.mockReturnValue({
      select: () =>
        Promise.resolve({
          _id: { toString: () => 'u1' },
          email: 'a@b.c',
          name: 'An',
          avatar: null,
          role: 'user',
          provider: 'credentials',
          createdAt: new Date(),
        }),
    })

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.email).toBe('a@b.c')
    expect(body.user.canChangePassword).toBe(true)
  })

  it('PATCH updates name', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1' })
    const save = vi.fn()
    mockFindById.mockResolvedValue({
      _id: { toString: () => 'u1' },
      email: 'a@b.c',
      name: 'Old',
      avatar: null,
      role: 'user',
      provider: 'google',
      save,
    })

    const req = new NextRequest('http://localhost/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    expect(save).toHaveBeenCalled()
  })
})
