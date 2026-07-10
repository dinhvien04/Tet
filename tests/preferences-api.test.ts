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

import { PATCH } from '@/app/api/profile/preferences/route'

describe('PATCH /api/profile/preferences', () => {
  beforeEach(() => vi.clearAllMocks())

  it('saves preferences', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1' })
    const save = vi.fn()
    mockFindById.mockResolvedValue({
      notificationPreferences: { eventReminders: true, taskReminders: true },
      save,
    })

    const req = new NextRequest('http://localhost/api/profile/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ eventReminders: false, taskReminders: true }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.preferences.eventReminders).toBe(false)
    expect(save).toHaveBeenCalled()
  })
})
