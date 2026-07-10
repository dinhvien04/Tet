import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/families/[id]/join/route'
import { supabase } from '@/lib/supabase'
import { NextRequest } from 'next/server'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
  },
}))

describe('POST /api/families/[id]/join', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/families/family-1/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode: 'TEST1234' }),
    })

    const response = await POST(request, { params: { id: 'family-1' } })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Vui lòng đăng nhập')
  })

  it('should return 400 if invite code is missing', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } as any },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/families/family-1/join', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request, { params: { id: 'family-1' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Mã mời không hợp lệ')
  })

  it('should return 404 if family does not exist or invite code does not match', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } as any },
      error: null,
    })

    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    } as any)

    const request = new NextRequest('http://localhost:3000/api/families/family-1/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode: 'INVALID' }),
    })

    const response = await POST(request, { params: { id: 'family-1' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Mã mời không hợp lệ')
  })

  it('should return 400 if user is already a member', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } as any },
      error: null,
    })

    let callCount = 0
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      callCount++
      
      if (callCount === 1) {
        // First call: families table
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'family-1',
              name: 'Test Family',
              invite_code: 'TEST1234',
            },
            error: null,
          }),
        } as any
      } else {
        // Second call: family_members table (check existing)
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'member-1' },
            error: null,
          }),
        } as any
      }
    })

    const request = new NextRequest('http://localhost:3000/api/families/family-1/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode: 'TEST1234' }),
    })

    const response = await POST(request, { params: { id: 'family-1' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Bạn đã là thành viên của nhà này')
  })

  it('should successfully add user as member with role "member"', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } as any },
      error: null,
    })

    let callCount = 0
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      callCount++
      
      if (callCount === 1) {
        // First call: families table
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'family-1',
              name: 'Test Family',
              invite_code: 'TEST1234',
            },
            error: null,
          }),
        } as any
      } else if (callCount === 2) {
        // Second call: family_members table (check existing)
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        } as any
      } else {
        // Third call: family_members table (insert)
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'member-1',
              family_id: 'family-1',
              user_id: 'user-1',
              role: 'member',
              joined_at: new Date().toISOString(),
            },
            error: null,
          }),
        } as any
      }
    })

    const request = new NextRequest('http://localhost:3000/api/families/family-1/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode: 'TEST1234' }),
    })

    const response = await POST(request, { params: { id: 'family-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.member.role).toBe('member')
    expect(data.member.family_id).toBe('family-1')
    expect(data.member.user_id).toBe('user-1')
    expect(data.family.name).toBe('Test Family')
  })

  it('should return 500 if database insert fails', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } as any },
      error: null,
    })

    let callCount = 0
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      callCount++
      
      if (callCount === 1) {
        // First call: families table
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'family-1',
              name: 'Test Family',
              invite_code: 'TEST1234',
            },
            error: null,
          }),
        } as any
      } else if (callCount === 2) {
        // Second call: family_members table (check existing)
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        } as any
      } else {
        // Third call: family_members table (insert fails)
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        } as any
      }
    })

    const request = new NextRequest('http://localhost:3000/api/families/family-1/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode: 'TEST1234' }),
    })

    const response = await POST(request, { params: { id: 'family-1' } })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Không thể tham gia nhà')
  })
})
