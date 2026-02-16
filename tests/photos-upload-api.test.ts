import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/photos/upload/route'
import { createClient } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn()
}))

describe('POST /api/photos/upload', () => {
  let mockSupabase: any
  let mockRequest: any

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn()
      },
      from: vi.fn(),
      storage: {
        from: vi.fn()
      }
    }

    vi.mocked(createClient).mockReturnValue(mockSupabase)
  })

  it('should return 401 if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated')
    })

    const formData = new FormData()
    formData.append('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }))
    formData.append('familyId', 'family-123')

    mockRequest = new Request('http://localhost/api/photos/upload', {
      method: 'POST',
      body: formData
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 400 if file is missing', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    const formData = new FormData()
    formData.append('familyId', 'family-123')

    mockRequest = new Request('http://localhost/api/photos/upload', {
      method: 'POST',
      body: formData
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing file')
  })

  it('should return 400 if familyId is missing', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    const formData = new FormData()
    formData.append('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }))

    mockRequest = new Request('http://localhost/api/photos/upload', {
      method: 'POST',
      body: formData
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing familyId')
  })

  it('should return 400 if file type is invalid', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    const formData = new FormData()
    formData.append('file', new File(['test'], 'test.pdf', { type: 'application/pdf' }))
    formData.append('familyId', 'family-123')

    mockRequest = new Request('http://localhost/api/photos/upload', {
      method: 'POST',
      body: formData
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Định dạng file không hợp lệ')
  })

  it('should return 400 if file size exceeds 10MB', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    // Create a file larger than 10MB
    const largeBuffer = new ArrayBuffer(11 * 1024 * 1024) // 11MB
    const largeFile = new File([largeBuffer], 'large.jpg', { type: 'image/jpeg' })

    const formData = new FormData()
    formData.append('file', largeFile)
    formData.append('familyId', 'family-123')

    mockRequest = new Request('http://localhost/api/photos/upload', {
      method: 'POST',
      body: formData
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('File quá lớn')
  })

  it('should return 403 if user is not a member of the family', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    const mockFrom = vi.fn().mockReturnValue({
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

    mockSupabase.from = mockFrom

    const formData = new FormData()
    formData.append('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }))
    formData.append('familyId', 'family-123')

    mockRequest = new Request('http://localhost/api/photos/upload', {
      method: 'POST',
      body: formData
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('You are not a member of this family')
  })

  it('should successfully upload photo and save metadata', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    // Mock family membership check
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

    // Mock photo metadata insert
    mockFrom.mockReturnValueOnce({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'photo-123',
              family_id: 'family-123',
              user_id: 'user-123',
              url: 'https://storage.example.com/photos/family-123/test.jpg',
              uploaded_at: new Date().toISOString(),
              users: {
                id: 'user-123',
                name: 'Test User',
                avatar: null,
                email: 'test@example.com'
              }
            },
            error: null
          })
        })
      })
    })

    mockSupabase.from = mockFrom

    // Mock storage upload
    const mockStorageFrom = vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({
        data: { path: 'family-123/test.jpg' },
        error: null
      }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: 'https://storage.example.com/photos/family-123/test.jpg' }
      })
    })

    mockSupabase.storage.from = mockStorageFrom

    const formData = new FormData()
    formData.append('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }))
    formData.append('familyId', 'family-123')

    mockRequest = new Request('http://localhost/api/photos/upload', {
      method: 'POST',
      body: formData
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.id).toBe('photo-123')
    expect(data.family_id).toBe('family-123')
    expect(data.user_id).toBe('user-123')
    expect(data.url).toContain('https://storage.example.com')
  })

  it('should handle storage quota exceeded error', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    // Mock family membership check
    mockSupabase.from = vi.fn().mockReturnValue({
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

    // Mock storage upload with quota error
    mockSupabase.storage.from = vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Storage quota exceeded' }
      })
    })

    const formData = new FormData()
    formData.append('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }))
    formData.append('familyId', 'family-123')

    mockRequest = new Request('http://localhost/api/photos/upload', {
      method: 'POST',
      body: formData
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(507)
    expect(data.error).toContain('Dung lượng lưu trữ đã đầy')
  })
})
