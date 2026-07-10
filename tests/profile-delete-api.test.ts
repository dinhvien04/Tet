import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { AuthError } from '@/lib/authorization'

const mockRequireUser = vi.hoisted(() => vi.fn())
const mockFindById = vi.hoisted(() => vi.fn())
const mockCount = vi.hoisted(() => vi.fn())
const mockMemberFind = vi.hoisted(() => vi.fn())
const mockDeleteMany = vi.hoisted(() => vi.fn())
const mockWalletFind = vi.hoisted(() => vi.fn())
const mockRoundFindOne = vi.hoisted(() => vi.fn())
const mockFamilyFind = vi.hoisted(() => vi.fn())

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
    countDocuments: (...a: unknown[]) => mockCount(...a),
  },
}))
vi.mock('@/lib/models/FamilyMember', () => ({
  default: {
    find: (...a: unknown[]) => mockMemberFind(...a),
    countDocuments: vi.fn(async () => 2),
    findOne: vi.fn(async () => ({ userId: 'admin2' })),
    deleteMany: (...a: unknown[]) => mockDeleteMany(...a),
  },
}))
vi.mock('@/lib/models/Post', () => ({ default: { deleteMany: mockDeleteMany } }))
vi.mock('@/lib/models/Reaction', () => ({ default: { deleteMany: mockDeleteMany } }))
vi.mock('@/lib/models/Comment', () => ({ default: { deleteMany: mockDeleteMany } }))
vi.mock('@/lib/models/Photo', () => ({ default: { deleteMany: mockDeleteMany } }))
vi.mock('@/lib/models/Notification', () => ({ default: { deleteMany: mockDeleteMany } }))
vi.mock('@/lib/models/EventRsvp', () => ({ default: { deleteMany: mockDeleteMany } }))
vi.mock('@/lib/models/BauCuaWallet', () => ({
  default: { find: (...a: unknown[]) => mockWalletFind(...a), deleteMany: mockDeleteMany },
}))
vi.mock('@/lib/models/BauCuaBet', () => ({ default: { deleteMany: mockDeleteMany } }))
vi.mock('@/lib/models/BauCuaRound', () => ({
  default: { findOne: (...a: unknown[]) => mockRoundFindOne(...a) },
}))
vi.mock('@/lib/models/Family', () => ({
  default: { find: (...a: unknown[]) => mockFamilyFind(...a) },
}))
vi.mock('@/lib/models/FamilyJoinRequest', () => ({
  default: { deleteMany: mockDeleteMany },
}))
vi.mock('@/lib/auth', () => ({
  hashPassword: vi.fn(),
  isValidPassword: () => ({ valid: true }),
  verifyPassword: vi.fn(),
}))

import { DELETE } from '@/app/api/profile/route'

describe('DELETE /api/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDeleteMany.mockResolvedValue({})
    mockMemberFind.mockResolvedValue([])
    mockWalletFind.mockResolvedValue([])
    mockRoundFindOne.mockResolvedValue(null)
    mockFamilyFind.mockResolvedValue([])
  })

  it('requires confirm phrase', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1' })
    const req = new NextRequest('http://localhost/api/profile', {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'nope' }),
    })
    const res = await DELETE(req)
    expect(res.status).toBe(400)
  })

  it('soft-deletes account with confirm', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1' })
    const save = vi.fn()
    mockFindById.mockResolvedValue({
      _id: 'u1',
      role: 'user',
      status: 'active',
      sessionVersion: 0,
      save,
    })

    const req = new NextRequest('http://localhost/api/profile', {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'XOA TAI KHOAN' }),
    })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    expect(save).toHaveBeenCalled()
  })
})
