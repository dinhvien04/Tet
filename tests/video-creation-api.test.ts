import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/videos/create/route'
import { NextRequest } from 'next/server'

// Create mock functions
const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockStorageFrom = vi.fn()

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser
    },
    from: mockFrom,
    storage: {
      from: mockStorageFrom
    }
  }))
}))

describe('POST /api/videos/create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 if user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated')
    })

    const request = new NextRequest('http://localhost:3000/api/videos/create', {
      method: 'POST',
      body: JSON.stringify({
        familyId: 'family-123',
        photoUrls: ['url1', 'url2'],
        videoBlob: 'data:video/webm;base64,test'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 400 if required fields are missing', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    const request = new NextRequest('http://localhost:3000/api/videos/create', {
      method: 'POST',
      body: JSON.stringify({
        familyId: 'family-123'
        // Missing photoUrls and videoBlob
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Missing required fields')
  })

  it('should return 403 if user is not a member of the family', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: null })
          }))
        }))
      }))
    })

    const request = new NextRequest('http://localhost:3000/api/videos/create', {
      method: 'POST',
      body: JSON.stringify({
        familyId: 'family-123',
        photoUrls: ['url1', 'url2'],
        videoBlob: 'data:video/webm;base64,test'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('You are not a member of this family')
  })

  it('should successfully upload video and return public URL', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'family_members') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ 
                  data: { id: 'member-123' }, 
                  error: null 
                })
              }))
            }))
          }))
        }
      } else if (table === 'photos') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn().mockResolvedValue({
                data: [
                  { id: 'photo-1', url: 'url1' },
                  { id: 'photo-2', url: 'url2' }
                ],
                error: null
              })
            }))
          }))
        }
      }
      return {}
    })

    const mockUpload = vi.fn().mockResolvedValue({
      data: { path: 'family-123/recap-123.webm' },
      error: null
    })

    mockStorageFrom.mockReturnValue({
      upload: mockUpload,
      getPublicUrl: vi.fn(() => ({
        data: { publicUrl: 'https://example.com/video.webm' }
      }))
    })

    const request = new NextRequest('http://localhost:3000/api/videos/create', {
      method: 'POST',
      body: JSON.stringify({
        familyId: 'family-123',
        photoUrls: ['url1', 'url2'],
        videoBlob: 'data:video/webm;base64,dGVzdA=='
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.videoUrl).toBe('https://example.com/video.webm')
    expect(data.path).toBe('family-123/recap-123.webm')
    expect(mockUpload).toHaveBeenCalled()
  })
})
