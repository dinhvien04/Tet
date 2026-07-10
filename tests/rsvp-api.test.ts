import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { AuthError } from '@/lib/authorization'

const mockRequireUser = vi.hoisted(() => vi.fn())
const mockEventFind = vi.hoisted(() => vi.fn())
const mockMemberFind = vi.hoisted(() => vi.fn())
const mockRsvpUpdate = vi.hoisted(() => vi.fn())

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
vi.mock('@/lib/models/Event', () => ({
  default: { findById: (...a: unknown[]) => mockEventFind(...a) },
}))
vi.mock('@/lib/models/FamilyMember', () => ({
  default: { findOne: (...a: unknown[]) => mockMemberFind(...a) },
}))
vi.mock('@/lib/models/EventRsvp', () => ({
  RSVP_STATUSES: ['going', 'maybe', 'not_going'],
  default: {
    findOneAndUpdate: (...a: unknown[]) => mockRsvpUpdate(...a),
    find: () => ({
      populate: () => ({ lean: async () => [] }),
    }),
    findOne: () => ({ lean: async () => null }),
  },
}))

import { PUT } from '@/app/api/events/[id]/rsvp/route'

describe('PUT /api/events/[id]/rsvp', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects invalid status', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1' })
    mockEventFind.mockResolvedValue({ familyId: 'f1' })
    mockMemberFind.mockResolvedValue({ role: 'member' })

    const req = new NextRequest('http://localhost/api/events/e1/rsvp', {
      method: 'PUT',
      body: JSON.stringify({ status: 'invalid' }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: 'e1' }) })
    expect(res.status).toBe(400)
  })

  it('saves going', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1' })
    mockEventFind.mockResolvedValue({ familyId: 'f1' })
    mockMemberFind.mockResolvedValue({ role: 'member' })
    mockRsvpUpdate.mockResolvedValue({
      status: 'going',
      updatedAt: new Date(),
    })

    const req = new NextRequest('http://localhost/api/events/e1/rsvp', {
      method: 'PUT',
      body: JSON.stringify({ status: 'going' }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: 'e1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.rsvp.status).toBe('going')
  })
})
