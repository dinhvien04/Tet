import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { AuthError } from '@/lib/authorization'

const mockRequireFamilyAdmin = vi.hoisted(() => vi.fn())
const mockRequireFamilyMember = vi.hoisted(() => vi.fn())
const mockRequireUser = vi.hoisted(() => vi.fn())
const mockWithTx = vi.hoisted(() => vi.fn())
const mockFindOne = vi.hoisted(() => vi.fn())
const mockSave = vi.hoisted(() => vi.fn())
const mockPopulate = vi.hoisted(() => vi.fn())
const mockDeleteOne = vi.hoisted(() => vi.fn())
const mockCasDec = vi.hoisted(() => vi.fn())
const mockCasInc = vi.hoisted(() => vi.fn())

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
    requireFamilyAdmin: (...a: unknown[]) => mockRequireFamilyAdmin(...a),
    requireFamilyMember: (...a: unknown[]) => mockRequireFamilyMember(...a),
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
  TransactionNotSupportedError: class extends Error {
    constructor(m?: string) {
      super(m)
      this.name = 'TransactionNotSupportedError'
    }
  },
  withMongoTransaction: (fn: (s: undefined) => Promise<unknown>) => mockWithTx(fn),
}))

vi.mock('@/lib/admin-invariant', () => ({
  casDecrementFamilyAdmin: (...a: unknown[]) => mockCasDec(...a),
  casIncrementFamilyAdmin: (...a: unknown[]) => mockCasInc(...a),
}))

vi.mock('@/lib/models/FamilyMember', () => ({
  default: {
    findOne: (...a: unknown[]) => mockFindOne(...a),
    deleteOne: (...a: unknown[]) => mockDeleteOne(...a),
    find: vi.fn(),
  },
}))

import { PATCH, DELETE } from '@/app/api/families/[id]/members/route'

const FAMILY = '507f1f77bcf86cd799439011'
const MEMBER = '507f1f77bcf86cd799439022'

describe('last-admin invariant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireFamilyAdmin.mockResolvedValue({})
    mockRequireUser.mockResolvedValue({ id: '507f1f77bcf86cd799439099' })
    mockWithTx.mockImplementation(async (fn: (s: undefined) => Promise<unknown>) => fn(undefined))
    mockCasDec.mockResolvedValue(true)
    mockCasInc.mockResolvedValue(undefined)
  })

  it('refuses demoting the only admin', async () => {
    const target = {
      _id: MEMBER,
      role: 'admin',
      userId: {
        _id: { toString: () => MEMBER },
        name: 'A',
      },
      joinedAt: new Date(),
      save: mockSave,
      populate: mockPopulate,
    }
    mockFindOne.mockReturnValue({
      populate: async () => target,
    })
    mockCasDec.mockResolvedValue(false)
    mockSave.mockResolvedValue(target)
    mockPopulate.mockResolvedValue(target)

    const res = await PATCH(
      new NextRequest('http://localhost/api/families/x/members', {
        method: 'PATCH',
        body: JSON.stringify({ memberId: MEMBER, role: 'member' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      { params: Promise.resolve({ id: FAMILY }) }
    )

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/admin/i)
    expect(mockSave).not.toHaveBeenCalled()
  })

  it('allows demote when CAS succeeds (another admin exists)', async () => {
    const target = {
      _id: MEMBER,
      role: 'admin',
      userId: {
        _id: { toString: () => MEMBER },
        name: 'A',
      },
      joinedAt: new Date(),
      save: mockSave.mockImplementation(async function (this: { role: string }) {
        this.role = 'member'
        return this
      }),
      populate: mockPopulate.mockImplementation(async function (this: unknown) {
        return this
      }),
    }
    mockFindOne.mockReturnValue({
      populate: async () => target,
    })
    mockCasDec.mockResolvedValue(true)

    const res = await PATCH(
      new NextRequest('http://localhost/api/families/x/members', {
        method: 'PATCH',
        body: JSON.stringify({ memberId: MEMBER, role: 'member' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      { params: Promise.resolve({ id: FAMILY }) }
    )

    expect(res.status).toBe(200)
    expect(mockSave).toHaveBeenCalled()
    expect(mockCasDec).toHaveBeenCalled()
  })

  it('refuses deleting the only admin', async () => {
    mockFindOne.mockResolvedValue({
      _id: MEMBER,
      role: 'admin',
      userId: { toString: () => MEMBER },
    })
    mockCasDec.mockResolvedValue(false)

    const res = await DELETE(
      new NextRequest(`http://localhost/api/families/x/members?memberId=${MEMBER}`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: FAMILY }) }
    )

    expect(res.status).toBe(400)
    expect(mockDeleteOne).not.toHaveBeenCalled()
  })
})
