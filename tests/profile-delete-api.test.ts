import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockRequireUser = vi.hoisted(() => vi.fn())
const mockFindById = vi.hoisted(() => vi.fn())
const mockWithTx = vi.hoisted(() => vi.fn())
const mockEnqueue = vi.hoisted(() => vi.fn())
const mockCasFamily = vi.hoisted(() => vi.fn())
const mockCasSystem = vi.hoisted(() => vi.fn())

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
vi.mock('@/lib/mongo-transaction', () => ({
  withMongoTransaction: (fn: (s: undefined) => Promise<unknown>) => mockWithTx(fn),
  TransactionNotSupportedError: class extends Error {
    constructor(m?: string) {
      super(m)
      this.name = 'TransactionNotSupportedError'
    }
  },
}))
vi.mock('@/lib/admin-invariant', () => ({
  casDecrementFamilyAdmin: (...a: unknown[]) => mockCasFamily(...a),
  casDecrementSystemAdmin: (...a: unknown[]) => mockCasSystem(...a),
}))
vi.mock('@/lib/storage-cleanup', () => ({
  enqueueStorageCleanup: (...a: unknown[]) => mockEnqueue(...a),
}))
vi.mock('@/lib/models/User', () => ({
  default: {
    findById: (...a: unknown[]) => mockFindById(...a),
  },
}))
vi.mock('@/lib/models/FamilyMember', () => ({
  default: {
    find: vi.fn(async () => []),
    deleteMany: vi.fn(async () => ({})),
    findOne: vi.fn(async () => null),
  },
}))
vi.mock('@/lib/models/Post', () => ({ default: { deleteMany: vi.fn() } }))
vi.mock('@/lib/models/Reaction', () => ({ default: { deleteMany: vi.fn() } }))
vi.mock('@/lib/models/Comment', () => ({ default: { deleteMany: vi.fn() } }))
vi.mock('@/lib/models/Photo', () => ({
  default: {
    find: vi.fn(async () => []),
    deleteMany: vi.fn(),
  },
}))
vi.mock('@/lib/models/Notification', () => ({ default: { deleteMany: vi.fn() } }))
vi.mock('@/lib/models/EventRsvp', () => ({ default: { deleteMany: vi.fn() } }))
vi.mock('@/lib/models/BauCuaWallet', () => ({
  default: { find: vi.fn(async () => []), deleteMany: vi.fn() },
}))
vi.mock('@/lib/models/BauCuaBet', () => ({ default: { deleteMany: vi.fn() } }))
vi.mock('@/lib/models/BauCuaRound', () => ({
  default: { findOne: vi.fn(async () => null) },
}))
vi.mock('@/lib/models/Family', () => ({
  default: { find: vi.fn(async () => []) },
}))
vi.mock('@/lib/models/FamilyJoinRequest', () => ({
  default: { deleteMany: vi.fn() },
}))
vi.mock('@/lib/models/StorageCleanupJob', () => ({
  default: { countDocuments: vi.fn(async () => 0) },
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
    mockEnqueue.mockResolvedValue(undefined)
    mockCasFamily.mockResolvedValue(true)
    mockCasSystem.mockResolvedValue(true)
    mockWithTx.mockImplementation(async (fn: (s: undefined) => Promise<unknown>) => fn(undefined))
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

  it('soft-deletes account with confirm via transaction', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1' })
    const save = vi.fn()
    const userDoc = {
      _id: 'u1',
      role: 'user',
      status: 'active',
      sessionVersion: 0,
      save,
    }
    // Pre-check + inside transaction
    mockFindById.mockResolvedValue(userDoc)

    const req = new NextRequest('http://localhost/api/profile', {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'XOA TAI KHOAN' }),
    })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    expect(mockWithTx).toHaveBeenCalled()
    expect(save).toHaveBeenCalled()
    expect(userDoc.status).toBe('deleted')
    expect(userDoc.password).toBeUndefined()
  })

  it('idempotent when already deleted', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1' })
    mockFindById.mockResolvedValue({
      _id: 'u1',
      status: 'deleted',
    })
    const req = new NextRequest('http://localhost/api/profile', {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'DELETE' }),
    })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.alreadyDeleted).toBe(true)
  })
})
