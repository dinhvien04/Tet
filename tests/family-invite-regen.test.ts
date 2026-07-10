import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { AuthError } from '@/lib/authorization'

const mockRequireFamilyAdmin = vi.hoisted(() => vi.fn())
const mockFindByIdAndUpdate = vi.hoisted(() => vi.fn())
const mockGenerate = vi.hoisted(() => vi.fn())

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
    authErrorResponse: (error: unknown) => {
      if (error instanceof AuthError) {
        return { error: error.message, status: error.status }
      }
      return { error: 'error', status: 500 }
    },
  }
})

vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn(async () => ({})) }))
vi.mock('@/lib/invite-code', () => ({
  generateUniqueInviteCode: () => mockGenerate(),
}))
vi.mock('@/lib/models/Family', () => ({
  default: {
    findByIdAndUpdate: (...a: unknown[]) => mockFindByIdAndUpdate(...a),
  },
}))

import { POST } from '@/app/api/families/[id]/invite/route'

describe('POST /api/families/[id]/invite', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 403 when not admin', async () => {
    mockRequireFamilyAdmin.mockRejectedValue(
      new AuthError('Chỉ admin gia đình mới được thực hiện thao tác này', 403)
    )
    const res = await POST(new NextRequest('http://localhost/api/families/f1/invite'), {
      params: Promise.resolve({ id: 'f1' }),
    })
    expect(res.status).toBe(403)
  })

  it('regenerates invite code', async () => {
    mockRequireFamilyAdmin.mockResolvedValue({ user: { id: 'a1' } })
    mockGenerate.mockResolvedValue('NEWCODE1')
    mockFindByIdAndUpdate.mockResolvedValue({
      _id: { toString: () => 'f1' },
      name: 'Nha A',
      inviteCode: 'NEWCODE1',
    })

    const res = await POST(new NextRequest('http://localhost/api/families/f1/invite'), {
      params: Promise.resolve({ id: 'f1' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.family.inviteCode).toBe('NEWCODE1')
  })
})
