import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockRequireUser = vi.hoisted(() => vi.fn())
const mockDeleteAccount = vi.hoisted(() => vi.fn())

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
vi.mock('@/lib/services/account/delete-account', () => ({
  deleteUserAccount: (...a: unknown[]) => mockDeleteAccount(...a),
}))
vi.mock('@/lib/request-id', () => ({
  getOrCreateRequestId: () => 'req-test',
}))
vi.mock('@/lib/mongo-transaction', () => ({
  TransactionNotSupportedError: class extends Error {
    constructor(m?: string) {
      super(m)
      this.name = 'TransactionNotSupportedError'
    }
  },
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
    mockDeleteAccount.mockResolvedValue({
      success: true,
      cleanupPending: false,
    })
  })

  it('requires confirm phrase', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1' })
    const req = new NextRequest('http://localhost/api/profile', {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'nope' }),
    })
    const res = await DELETE(req)
    expect(res.status).toBe(400)
    expect(mockDeleteAccount).not.toHaveBeenCalled()
  })

  it('delegates to deleteUserAccount service', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1' })
    const req = new NextRequest('http://localhost/api/profile', {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'XOA TAI KHOAN' }),
    })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    expect(mockDeleteAccount).toHaveBeenCalledWith({
      userId: 'u1',
      requestId: 'req-test',
    })
    expect(res.headers.get('x-request-id')).toBe('req-test')
  })

  it('idempotent when service returns alreadyDeleted', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1' })
    mockDeleteAccount.mockResolvedValue({
      success: true,
      alreadyDeleted: true,
      cleanupPending: true,
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
