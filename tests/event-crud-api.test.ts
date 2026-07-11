import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { AuthError } from '@/lib/authorization'

const mockRequireUser = vi.hoisted(() => vi.fn())
const mockFindById = vi.hoisted(() => vi.fn())
const mockFindOne = vi.hoisted(() => vi.fn())
const mockDeleteMany = vi.hoisted(() => vi.fn())
const mockDeleteOne = vi.hoisted(() => vi.fn())
const mockWithTx = vi.hoisted(() => vi.fn())

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
vi.mock('@/lib/mongo-transaction', () => ({
  withMongoTransaction: (fn: (s: undefined) => Promise<unknown>) => mockWithTx(fn),
  TransactionNotSupportedError: class extends Error {
    constructor(m?: string) {
      super(m)
      this.name = 'TransactionNotSupportedError'
    }
  },
}))
vi.mock('@/lib/models/Event', () => ({
  default: {
    findById: (...a: unknown[]) => mockFindById(...a),
    deleteOne: (...a: unknown[]) => mockDeleteOne(...a),
  },
}))
vi.mock('@/lib/models/EventTask', () => ({
  default: { deleteMany: (...a: unknown[]) => mockDeleteMany(...a) },
}))
vi.mock('@/lib/models/EventRsvp', () => ({
  default: { deleteMany: (...a: unknown[]) => mockDeleteMany(...a) },
}))
vi.mock('@/lib/models/Notification', () => ({
  default: { deleteMany: (...a: unknown[]) => mockDeleteMany(...a) },
}))
vi.mock('@/lib/models/FamilyMember', () => ({
  default: { findOne: (...a: unknown[]) => mockFindOne(...a) },
}))

import { DELETE } from '@/app/api/events/[id]/route'

describe('DELETE /api/events/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWithTx.mockImplementation(async (fn: (s: undefined) => Promise<unknown>) =>
      fn(undefined)
    )
  })

  it('forbids non-creator non-admin', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u2' })
    mockFindById.mockResolvedValue({
      _id: { toString: () => 'e1' },
      createdBy: { toString: () => 'u1' },
      familyId: 'f1',
    })
    mockFindOne.mockResolvedValue({ role: 'member' })

    const res = await DELETE(new NextRequest('http://localhost/api/events/e1'), {
      params: Promise.resolve({ id: 'e1' }),
    })
    expect(res.status).toBe(403)
  })

  it('allows family admin to delete with cascade in transaction', async () => {
    mockRequireUser.mockResolvedValue({ id: 'admin1' })
    mockFindById.mockResolvedValue({
      _id: { toString: () => 'e1' },
      createdBy: { toString: () => 'u1' },
      familyId: 'f1',
    })
    mockFindOne.mockResolvedValue({ role: 'admin' })
    mockDeleteMany.mockResolvedValue({})
    mockDeleteOne.mockResolvedValue({})

    const res = await DELETE(new NextRequest('http://localhost/api/events/e1'), {
      params: Promise.resolve({ id: 'e1' }),
    })
    expect(res.status).toBe(200)
    expect(mockWithTx).toHaveBeenCalled()
    expect(mockDeleteMany).toHaveBeenCalled()
    expect(mockDeleteOne).toHaveBeenCalled()
  })
})
