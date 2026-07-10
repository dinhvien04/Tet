import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetServerSession = vi.hoisted(() => vi.fn())
const mockConnectDB = vi.hoisted(() => vi.fn())
const mockGenerateCode = vi.hoisted(() => vi.fn())
const mockFamilyCreate = vi.hoisted(() => vi.fn())
const mockMemberCreate = vi.hoisted(() => vi.fn())
const mockFamilyDelete = vi.hoisted(() => vi.fn())

vi.mock('next-auth', () => ({
  getServerSession: (...a: unknown[]) => mockGetServerSession(...a),
}))

vi.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}))

vi.mock('@/lib/mongodb', () => ({
  connectDB: (...a: unknown[]) => mockConnectDB(...a),
}))

vi.mock('@/lib/invite-code', () => ({
  generateUniqueInviteCode: (...a: unknown[]) => mockGenerateCode(...a),
}))

vi.mock('@/lib/models/Family', () => ({
  default: {
    create: (...a: unknown[]) => mockFamilyCreate(...a),
    findByIdAndDelete: (...a: unknown[]) => mockFamilyDelete(...a),
    findOne: vi.fn(),
  },
}))

vi.mock('@/lib/models/FamilyMember', () => ({
  default: {
    create: (...a: unknown[]) => mockMemberCreate(...a),
    find: vi.fn(),
  },
}))

import { POST } from '@/app/api/families/route'

describe('POST /api/families', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConnectDB.mockResolvedValue({})
    mockGenerateCode.mockResolvedValue('ABCD1234')
  })

  it('returns 401 when not logged in', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/families', {
      method: 'POST',
      body: JSON.stringify({ name: 'Gia đình A' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 for empty name', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } })
    const req = new NextRequest('http://localhost/api/families', {
      method: 'POST',
      body: JSON.stringify({ name: '   ' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('creates family and admin membership', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } })
    mockFamilyCreate.mockResolvedValue({
      _id: { toString: () => 'f1' },
      name: 'Gia đình A',
      inviteCode: 'ABCD1234',
      createdAt: new Date(),
    })
    mockMemberCreate.mockResolvedValue({})

    const req = new NextRequest('http://localhost/api/families', {
      method: 'POST',
      body: JSON.stringify({ name: 'Gia đình A' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.family.invite_code).toBe('ABCD1234')
    expect(mockMemberCreate).toHaveBeenCalled()
  })
})
