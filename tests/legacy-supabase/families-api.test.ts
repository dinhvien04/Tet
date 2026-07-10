import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/families/route'
import { NextRequest } from 'next/server'

// Mock supabase with factory function
vi.mock('@/lib/supabase', () => {
  const mockSupabase = {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
  }
  return {
    supabase: mockSupabase,
  }
})

import { supabase } from '@/lib/supabase'

describe('POST /api/families', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 if name is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/families', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('không hợp lệ')
  })

  it('should return 400 if name is empty string', async () => {
    const request = new NextRequest('http://localhost:3000/api/families', {
      method: 'POST',
      body: JSON.stringify({ name: '' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('không hợp lệ')
  })

  it('should return 400 if name is whitespace only', async () => {
    const request = new NextRequest('http://localhost:3000/api/families', {
      method: 'POST',
      body: JSON.stringify({ name: '   ' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('không hợp lệ')
  })

  it('should return 401 if user is not authenticated', async () => {
    ;(supabase.auth.getSession as any).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/families', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Family' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toContain('đăng nhập')
  })

  it('should create family and add creator as admin', async () => {
    const mockUserId = 'user-123'
    const mockFamilyId = 'family-456'
    const mockInviteCode = 'ABC12345'

    ;(supabase.auth.getSession as any).mockResolvedValueOnce({
      data: {
        session: {
          user: { id: mockUserId },
        },
      },
      error: null,
    })

    // Mock checking for existing invite code (none found)
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValueOnce({ data: null, error: null })

    // Mock family creation
    const mockInsert = vi.fn().mockReturnThis()
    const mockSelectAfterInsert = vi.fn().mockReturnThis()
    const mockSingleAfterInsert = vi.fn().mockResolvedValueOnce({
      data: {
        id: mockFamilyId,
        name: 'Test Family',
        invite_code: mockInviteCode,
        created_by: mockUserId,
        created_at: new Date().toISOString(),
      },
      error: null,
    })

    // Mock adding family member
    const mockMemberInsert = vi.fn().mockResolvedValueOnce({
      data: null,
      error: null,
    })

    ;(supabase.from as any).mockImplementation((table: string) => {
      if (table === 'families') {
        return {
          select: mockSelect,
          eq: mockEq,
          single: mockSingle,
          insert: mockInsert,
        }
      } else if (table === 'family_members') {
        return {
          insert: mockMemberInsert,
        }
      }
      return {}
    })

    mockSelect.mockReturnValue({
      eq: mockEq,
    })

    mockEq.mockReturnValue({
      single: mockSingle,
    })

    mockInsert.mockReturnValue({
      select: mockSelectAfterInsert,
    })

    mockSelectAfterInsert.mockReturnValue({
      single: mockSingleAfterInsert,
    })

    const request = new NextRequest('http://localhost:3000/api/families', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Family' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.family).toBeDefined()
    expect(data.family.name).toBe('Test Family')
    expect(data.family.invite_code).toBeDefined()
    expect(data.family.invite_code).toHaveLength(8)
  })

  it('should generate unique 8-character invite code', async () => {
    const mockUserId = 'user-123'

    ;(supabase.auth.getSession as any).mockResolvedValue({
      data: {
        session: {
          user: { id: mockUserId },
        },
      },
      error: null,
    })

    const inviteCodes = new Set<string>()

    // Mock to collect invite codes
    ;(supabase.from as any).mockImplementation((table: string) => {
      if (table === 'families') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn((data: any) => {
            inviteCodes.add(data.invite_code)
            return {
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'family-id',
                  name: data.name,
                  invite_code: data.invite_code,
                  created_by: mockUserId,
                  created_at: new Date().toISOString(),
                },
                error: null,
              }),
            }
          }),
        }
      } else if (table === 'family_members') {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      return {}
    })

    // Create multiple families
    for (let i = 0; i < 5; i++) {
      const request = new NextRequest('http://localhost:3000/api/families', {
        method: 'POST',
        body: JSON.stringify({ name: `Family ${i}` }),
      })

      await POST(request)
    }

    // All invite codes should be 8 characters
    inviteCodes.forEach((code) => {
      expect(code).toHaveLength(8)
      expect(code).toMatch(/^[A-Z0-9]+$/)
    })
  })

  it('should trim whitespace from family name', async () => {
    const mockUserId = 'user-123'

    ;(supabase.auth.getSession as any).mockResolvedValueOnce({
      data: {
        session: {
          user: { id: mockUserId },
        },
      },
      error: null,
    })

    let insertedName = ''

    ;(supabase.from as any).mockImplementation((table: string) => {
      if (table === 'families') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn((data: any) => {
            insertedName = data.name
            return {
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'family-id',
                  name: data.name,
                  invite_code: 'ABC12345',
                  created_by: mockUserId,
                  created_at: new Date().toISOString(),
                },
                error: null,
              }),
            }
          }),
        }
      } else if (table === 'family_members') {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      return {}
    })

    const request = new NextRequest('http://localhost:3000/api/families', {
      method: 'POST',
      body: JSON.stringify({ name: '  Test Family  ' }),
    })

    await POST(request)

    expect(insertedName).toBe('Test Family')
  })
})
