import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { AuthError } from '@/lib/authorization'

const mockRequireUser = vi.hoisted(() => vi.fn())
const mockFindById = vi.hoisted(() => vi.fn())
const mockFindOne = vi.hoisted(() => vi.fn())
const mockDeleteManyReaction = vi.hoisted(() => vi.fn())
const mockDeleteManyComment = vi.hoisted(() => vi.fn())
const mockDeleteOne = vi.hoisted(() => vi.fn())

vi.mock('@/lib/authorization', async () => {
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
vi.mock('@/lib/models/Post', () => ({
  default: {
    findById: (...a: unknown[]) => mockFindById(...a),
    deleteOne: (...a: unknown[]) => mockDeleteOne(...a),
  },
}))
vi.mock('@/lib/models/FamilyMember', () => ({
  default: { findOne: (...a: unknown[]) => mockFindOne(...a) },
}))
vi.mock('@/lib/models/Reaction', () => ({
  default: { deleteMany: (...a: unknown[]) => mockDeleteManyReaction(...a) },
}))
vi.mock('@/lib/models/Comment', () => ({
  default: { deleteMany: (...a: unknown[]) => mockDeleteManyComment(...a) },
}))

import { DELETE } from '@/app/api/posts/[id]/route'

describe('DELETE /api/posts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not logged in', async () => {
    mockRequireUser.mockRejectedValue(new AuthError('Vui lòng đăng nhập', 401))
    const res = await DELETE(new NextRequest('http://localhost/api/posts/1'), {
      params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }),
    })
    expect(res.status).toBe(401)
  })

  it('allows author to delete', async () => {
    mockRequireUser.mockResolvedValue({ id: 'user1', role: 'user' })
    mockFindById.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      userId: { toString: () => 'user1' },
      familyId: 'fam1',
    })
    mockFindOne.mockResolvedValue({ role: 'member' })
    mockDeleteManyReaction.mockResolvedValue({})
    mockDeleteManyComment.mockResolvedValue({})
    mockDeleteOne.mockResolvedValue({})

    const res = await DELETE(new NextRequest('http://localhost/api/posts/1'), {
      params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('forbids non-author non-admin', async () => {
    mockRequireUser.mockResolvedValue({ id: 'user2', role: 'user' })
    mockFindById.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      userId: { toString: () => 'user1' },
      familyId: 'fam1',
    })
    mockFindOne.mockResolvedValue({ role: 'member' })

    const res = await DELETE(new NextRequest('http://localhost/api/posts/1'), {
      params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }),
    })
    expect(res.status).toBe(403)
  })
})
