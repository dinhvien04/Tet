import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { AuthError } from '@/lib/authorization'

const mockRequireUser = vi.hoisted(() => vi.fn())
const mockCommentFind = vi.hoisted(() => vi.fn())
const mockPostFind = vi.hoisted(() => vi.fn())
const mockMemberFind = vi.hoisted(() => vi.fn())
const mockDeleteOne = vi.hoisted(() => vi.fn())

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
vi.mock('@/lib/models/Comment', () => ({
  default: {
    findById: (...a: unknown[]) => mockCommentFind(...a),
    deleteOne: (...a: unknown[]) => mockDeleteOne(...a),
  },
}))
vi.mock('@/lib/models/Post', () => ({
  default: { findById: (...a: unknown[]) => mockPostFind(...a) },
}))
vi.mock('@/lib/models/FamilyMember', () => ({
  default: { findOne: (...a: unknown[]) => mockMemberFind(...a) },
}))

import { DELETE } from '@/app/api/comments/[id]/route'

describe('DELETE /api/comments/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('allows author', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1' })
    mockCommentFind.mockResolvedValue({
      _id: 'c1',
      userId: { toString: () => 'u1' },
      postId: 'p1',
    })
    mockPostFind.mockResolvedValue({ familyId: 'f1' })
    mockMemberFind.mockResolvedValue({ role: 'member' })
    mockDeleteOne.mockResolvedValue({})

    const res = await DELETE(new NextRequest('http://localhost/api/comments/c1'), {
      params: Promise.resolve({ id: 'c1' }),
    })
    expect(res.status).toBe(200)
  })

  it('forbids other members', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u2' })
    mockCommentFind.mockResolvedValue({
      _id: 'c1',
      userId: { toString: () => 'u1' },
      postId: 'p1',
    })
    mockPostFind.mockResolvedValue({ familyId: 'f1' })
    mockMemberFind.mockResolvedValue({ role: 'member' })

    const res = await DELETE(new NextRequest('http://localhost/api/comments/c1'), {
      params: Promise.resolve({ id: 'c1' }),
    })
    expect(res.status).toBe(403)
  })
})
