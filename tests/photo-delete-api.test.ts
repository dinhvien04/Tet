import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { AuthError } from '@/lib/authorization'

const mockRequireUser = vi.hoisted(() => vi.fn())
const mockFindById = vi.hoisted(() => vi.fn())
const mockFindOne = vi.hoisted(() => vi.fn())
const mockDeleteOne = vi.hoisted(() => vi.fn())
const mockDestroy = vi.hoisted(() => vi.fn())

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
vi.mock('@/lib/models/Photo', () => ({
  default: {
    findById: (...a: unknown[]) => mockFindById(...a),
    deleteOne: (...a: unknown[]) => mockDeleteOne(...a),
  },
}))
vi.mock('@/lib/models/FamilyMember', () => ({
  default: { findOne: (...a: unknown[]) => mockFindOne(...a) },
}))
vi.mock('@/lib/cloudinary', () => ({
  default: { uploader: { destroy: (...a: unknown[]) => mockDestroy(...a) } },
}))

import { DELETE } from '@/app/api/photos/[id]/route'

describe('DELETE /api/photos/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('allows uploader to delete and cleans cloudinary', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1' })
    mockFindById.mockResolvedValue({
      _id: 'p1',
      userId: { toString: () => 'u1' },
      familyId: 'f1',
      publicId: 'tet-connect/f1/x',
    })
    mockFindOne.mockResolvedValue({ role: 'member' })
    mockDeleteOne.mockResolvedValue({})
    mockDestroy.mockResolvedValue({})

    const res = await DELETE(new NextRequest('http://localhost/api/photos/p1'), {
      params: Promise.resolve({ id: 'p1' }),
    })
    expect(res.status).toBe(200)
    expect(mockDestroy).toHaveBeenCalledWith('tet-connect/f1/x')
  })

  it('forbids other members', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u2' })
    mockFindById.mockResolvedValue({
      _id: 'p1',
      userId: { toString: () => 'u1' },
      familyId: 'f1',
      publicId: 'x',
    })
    mockFindOne.mockResolvedValue({ role: 'member' })

    const res = await DELETE(new NextRequest('http://localhost/api/photos/p1'), {
      params: Promise.resolve({ id: 'p1' }),
    })
    expect(res.status).toBe(403)
  })
})
