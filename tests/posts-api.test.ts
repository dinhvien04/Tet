import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/posts/route'
import { GET } from '@/app/api/posts/route'
import { NextRequest } from 'next/server'

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

vi.mock('@/lib/supabase', () => ({
  createClient: () => mockSupabase,
}))

describe('Posts API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/posts', () => {
    it('should create a post successfully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'family_members') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: { id: 'member-1' }, error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'posts') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({
                  data: {
                    id: 'post-1',
                    family_id: 'family-1',
                    user_id: 'user-1',
                    content: 'Test content',
                    type: 'loi-chuc',
                    created_at: new Date().toISOString(),
                    users: {
                      id: 'user-1',
                      name: 'Test User',
                      avatar: null,
                      email: 'test@example.com'
                    }
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = new NextRequest('http://localhost/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          family_id: 'family-1',
          content: 'Test content',
          type: 'loi-chuc',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe('post-1')
      expect(data.content).toBe('Test content')
    })

    it('should return 401 when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      })

      const request = new NextRequest('http://localhost/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          family_id: 'family-1',
          content: 'Test content',
          type: 'loi-chuc',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 when missing required fields', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      const request = new NextRequest('http://localhost/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          family_id: 'family-1',
          // Missing content and type
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })

    it('should return 400 when type is invalid', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      const request = new NextRequest('http://localhost/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          family_id: 'family-1',
          content: 'Test content',
          type: 'invalid-type',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid type')
    })

    it('should return 403 when user is not a family member', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'family_members') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = new NextRequest('http://localhost/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          family_id: 'family-1',
          content: 'Test content',
          type: 'loi-chuc',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('not a member')
    })
  })

  describe('GET /api/posts', () => {
    it('should fetch posts successfully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      const mockPosts = [
        {
          id: 'post-1',
          family_id: 'family-1',
          user_id: 'user-1',
          content: 'Test post',
          type: 'loi-chuc',
          created_at: new Date().toISOString(),
          users: {
            id: 'user-1',
            name: 'Test User',
            avatar: null,
            email: 'test@example.com'
          }
        }
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'family_members') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: { id: 'member-1' }, error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'posts') {
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: mockPosts, error: null }),
              }),
            }),
          }
        }
        if (table === 'reactions') {
          return {
            select: () => ({
              in: () => Promise.resolve({ data: [], error: null }),
            }),
          }
        }
        return {}
      })

      const request = new NextRequest('http://localhost/api/posts?familyId=family-1')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].id).toBe('post-1')
    })

    it('should return 400 when familyId is missing', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      const request = new NextRequest('http://localhost/api/posts')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing familyId')
    })

    it('should return 401 when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      })

      const request = new NextRequest('http://localhost/api/posts?familyId=family-1')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })
})
