import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { AuthError } from '@/lib/authorization'

const mockRequireFamilyMember = vi.hoisted(() => vi.fn())
const mockRequireUser = vi.hoisted(() => vi.fn())
const mockPostCreate = vi.hoisted(() => vi.fn())
const mockPostFind = vi.hoisted(() => vi.fn())
const mockEventCreate = vi.hoisted(() => vi.fn())
const mockEventFind = vi.hoisted(() => vi.fn())
const mockReactionAgg = vi.hoisted(() => vi.fn())
const mockCommentAgg = vi.hoisted(() => vi.fn())
const mockReactionFind = vi.hoisted(() => vi.fn())

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
    requireFamilyMember: (...a: unknown[]) => mockRequireFamilyMember(...a),
    authErrorResponse: (error: unknown) => {
      if (error instanceof AuthError) {
        return { error: error.message, status: error.status }
      }
      return { error: 'error', status: 500 }
    },
  }
})

vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn(async () => ({})) }))
vi.mock('@/lib/models/Post', () => ({
  default: {
    create: (...a: unknown[]) => mockPostCreate(...a),
    find: (...a: unknown[]) => mockPostFind(...a),
  },
}))
vi.mock('@/lib/models/Event', () => ({
  default: {
    create: (...a: unknown[]) => mockEventCreate(...a),
    find: (...a: unknown[]) => mockEventFind(...a),
  },
}))
vi.mock('@/lib/models/Reaction', () => ({
  default: {
    aggregate: (...a: unknown[]) => mockReactionAgg(...a),
    find: (...a: unknown[]) => mockReactionFind(...a),
  },
}))
vi.mock('@/lib/models/Comment', () => ({
  default: {
    aggregate: (...a: unknown[]) => mockCommentAgg(...a),
  },
}))
vi.mock('@/lib/models/FamilyMember', () => ({
  default: { findOne: vi.fn() },
}))

import { POST as createPost, GET as getPosts } from '@/app/api/posts/route'
import { POST as createEvent, GET as getEvents } from '@/app/api/events/route'

const VALID_FAMILY = '507f1f77bcf86cd799439011'
const VALID_USER = '507f1f77bcf86cd799439012'

function jsonReq(url: string, body: unknown) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/posts validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireFamilyMember.mockResolvedValue({
      user: { id: VALID_USER },
      familyId: VALID_FAMILY,
    })
    mockPostCreate.mockImplementation(async (doc: Record<string, unknown>) => ({
      _id: { toString: () => '507f1f77bcf86cd799439099' },
      familyId: { toString: () => VALID_FAMILY },
      content: doc.content,
      type: doc.type,
      createdAt: new Date(),
      userId: {
        _id: { toString: () => VALID_USER },
        name: 'A',
        email: 'a@b.c',
        avatar: null,
      },
      populate: async function p() {
        return this
      },
    }))
  })

  it('rejects invalid family ObjectId with 400', async () => {
    const res = await createPost(
      jsonReq('http://localhost/api/posts', {
        familyId: 'not-an-id',
        content: 'hello',
        type: 'loi-chuc',
      })
    )
    expect(res.status).toBe(400)
    expect(mockPostCreate).not.toHaveBeenCalled()
  })

  it('rejects missing content', async () => {
    const res = await createPost(
      jsonReq('http://localhost/api/posts', {
        familyId: VALID_FAMILY,
        type: 'loi-chuc',
      })
    )
    expect(res.status).toBe(400)
  })

  it('rejects invalid type enum', async () => {
    const res = await createPost(
      jsonReq('http://localhost/api/posts', {
        familyId: VALID_FAMILY,
        content: 'x',
        type: 'spam',
      })
    )
    expect(res.status).toBe(400)
  })

  it('rejects oversized content', async () => {
    const res = await createPost(
      jsonReq('http://localhost/api/posts', {
        familyId: VALID_FAMILY,
        content: 'x'.repeat(6000),
        type: 'loi-chuc',
      })
    )
    expect(res.status).toBe(400)
  })

  it('accepts valid camelCase body', async () => {
    const res = await createPost(
      jsonReq('http://localhost/api/posts', {
        familyId: VALID_FAMILY,
        content: 'Chúc mừng năm mới',
        type: 'loi-chuc',
      })
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.post.familyId).toBe(VALID_FAMILY)
    expect(data.post.family_id).toBe(VALID_FAMILY)
  })

  it('accepts legacy family_id field', async () => {
    const res = await createPost(
      jsonReq('http://localhost/api/posts', {
        family_id: VALID_FAMILY,
        content: 'ok',
        type: 'cau-doi',
      })
    )
    expect(res.status).toBe(200)
  })
})

describe('GET /api/posts validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireUser.mockResolvedValue({ id: VALID_USER })
    mockRequireFamilyMember.mockResolvedValue({
      user: { id: VALID_USER },
      familyId: VALID_FAMILY,
    })
    const chain = {
      populate: () => chain,
      sort: () => chain,
      limit: () => chain,
      skip: () => chain,
      lean: async () => [],
    }
    mockPostFind.mockReturnValue(chain)
    mockReactionAgg.mockResolvedValue([])
    mockCommentAgg.mockResolvedValue([])
    mockReactionFind.mockReturnValue({
      select: () => ({ lean: async () => [] }),
    })
  })

  it('rejects invalid familyId query', async () => {
    const res = await getPosts(
      new NextRequest('http://localhost/api/posts?familyId=bad')
    )
    expect(res.status).toBe(400)
  })

  it('returns empty list for valid family', async () => {
    const res = await getPosts(
      new NextRequest(`http://localhost/api/posts?familyId=${VALID_FAMILY}`)
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.posts).toEqual([])
  })
})

describe('POST /api/events validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireFamilyMember.mockResolvedValue({
      user: { id: VALID_USER },
      familyId: VALID_FAMILY,
    })
    mockEventCreate.mockImplementation(async (doc: Record<string, unknown>) => ({
      _id: { toString: () => '507f1f77bcf86cd799439088' },
      familyId: { toString: () => VALID_FAMILY },
      title: doc.title,
      date: doc.date,
      location: doc.location,
      createdAt: new Date(),
      createdBy: {
        _id: { toString: () => VALID_USER },
        name: 'A',
        email: 'a@b.c',
        avatar: null,
      },
      populate: async function p() {
        return this
      },
    }))
  })

  it('rejects invalid date with 400', async () => {
    const res = await createEvent(
      jsonReq('http://localhost/api/events', {
        familyId: VALID_FAMILY,
        title: 'Họp mặt',
        date: 'not-a-date',
      })
    )
    expect(res.status).toBe(400)
    expect(mockEventCreate).not.toHaveBeenCalled()
  })

  it('rejects invalid ObjectId', async () => {
    const res = await createEvent(
      jsonReq('http://localhost/api/events', {
        familyId: 'xxx',
        title: 'Họp mặt',
        date: '2026-02-01T10:00:00.000Z',
      })
    )
    expect(res.status).toBe(400)
  })

  it('creates event with valid date', async () => {
    const res = await createEvent(
      jsonReq('http://localhost/api/events', {
        familyId: VALID_FAMILY,
        title: 'Tất niên',
        date: '2026-01-20T12:00:00.000Z',
        location: 'Hà Nội',
      })
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.event.familyId).toBe(VALID_FAMILY)
    expect(data.event.title).toBe('Tất niên')
  })
})

describe('GET /api/events validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireUser.mockResolvedValue({ id: VALID_USER })
    mockRequireFamilyMember.mockResolvedValue({
      user: { id: VALID_USER },
      familyId: VALID_FAMILY,
    })
    const chain = {
      populate: () => chain,
      sort: () => chain,
      limit: () => chain,
      lean: async () => [],
    }
    mockEventFind.mockReturnValue(chain)
  })

  it('rejects invalid filter enum', async () => {
    const res = await getEvents(
      new NextRequest(
        `http://localhost/api/events?familyId=${VALID_FAMILY}&filter=nope`
      )
    )
    expect(res.status).toBe(400)
  })

  it('accepts upcoming filter', async () => {
    const res = await getEvents(
      new NextRequest(
        `http://localhost/api/events?familyId=${VALID_FAMILY}&filter=upcoming`
      )
    )
    expect(res.status).toBe(200)
  })
})
