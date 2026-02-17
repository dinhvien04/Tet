import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from '@/app/api/photos/route'
import { createClient } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn()
}))

describe('GET /api/photos', () => {
  let mockSupabase: any
  let mockRequest: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: vi.fn()
      },
      from: vi.fn()
    }

    vi.mocked(createClient).mockReturnValue(mockSupabase)
  })

  it('should return 401 if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated')
    })

    mockRequest = new Request('http://localhost/api/photos?familyId=family-123')

    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 400 if familyId is missing', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams()
      }
    } as any

    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing familyId parameter')
  })

  it('should return 403 if user is not a member of the family', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    mockSupabase.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      })
    })

    mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams('familyId=family-123')
      }
    } as any

    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('You are not a member of this family')
  })

  it('should return photos ordered by upload time (newest first)', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    const mockPhotos = [
      {
        id: 'photo-3',
        family_id: 'family-123',
        user_id: 'user-123',
        url: 'https://example.com/photo3.jpg',
        uploaded_at: '2024-01-03T10:00:00Z',
        users: {
          id: 'user-123',
          name: 'User 1',
          avatar: null,
          email: 'user1@example.com'
        }
      },
      {
        id: 'photo-2',
        family_id: 'family-123',
        user_id: 'user-456',
        url: 'https://example.com/photo2.jpg',
        uploaded_at: '2024-01-02T10:00:00Z',
        users: {
          id: 'user-456',
          name: 'User 2',
          avatar: null,
          email: 'user2@example.com'
        }
      },
      {
        id: 'photo-1',
        family_id: 'family-123',
        user_id: 'user-123',
        url: 'https://example.com/photo1.jpg',
        uploaded_at: '2024-01-01T10:00:00Z',
        users: {
          id: 'user-123',
          name: 'User 1',
          avatar: null,
          email: 'user1@example.com'
        }
      }
    ]

    const mockFrom = vi.fn()
    
    // Mock family membership check
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'membership-123' },
              error: null
            })
          })
        })
      })
    })

    // Mock photos query
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockPhotos,
            error: null
          })
        })
      })
    })

    mockSupabase.from = mockFrom

    mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams('familyId=family-123')
      }
    } as any

    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(3)
    expect(data[0].id).toBe('photo-3')
    expect(data[1].id).toBe('photo-2')
    expect(data[2].id).toBe('photo-1')
    
    // Verify photos are ordered by uploaded_at descending
    expect(new Date(data[0].uploaded_at).getTime()).toBeGreaterThan(
      new Date(data[1].uploaded_at).getTime()
    )
    expect(new Date(data[1].uploaded_at).getTime()).toBeGreaterThan(
      new Date(data[2].uploaded_at).getTime()
    )
  })

  it('should return empty array if no photos exist', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    const mockFrom = vi.fn()
    
    // Mock family membership check
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'membership-123' },
              error: null
            })
          })
        })
      })
    })

    // Mock photos query with empty result
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })
    })

    mockSupabase.from = mockFrom

    mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams('familyId=family-123')
      }
    } as any

    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it('should include user information with each photo', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    const mockPhotos = [
      {
        id: 'photo-1',
        family_id: 'family-123',
        user_id: 'user-123',
        url: 'https://example.com/photo1.jpg',
        uploaded_at: '2024-01-01T10:00:00Z',
        users: {
          id: 'user-123',
          name: 'Test User',
          avatar: 'https://example.com/avatar.jpg',
          email: 'test@example.com'
        }
      }
    ]

    const mockFrom = vi.fn()
    
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'membership-123' },
              error: null
            })
          })
        })
      })
    })

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockPhotos,
            error: null
          })
        })
      })
    })

    mockSupabase.from = mockFrom

    mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams('familyId=family-123')
      }
    } as any

    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data[0].users).toBeDefined()
    expect(data[0].users.name).toBe('Test User')
    expect(data[0].users.avatar).toBe('https://example.com/avatar.jpg')
    expect(data[0].users.email).toBe('test@example.com')
  })

  it('should handle database errors gracefully', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    const mockFrom = vi.fn()
    
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'membership-123' },
              error: null
            })
          })
        })
      })
    })

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      })
    })

    mockSupabase.from = mockFrom

    mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams('familyId=family-123')
      }
    } as any

    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch photos')
  })
})
