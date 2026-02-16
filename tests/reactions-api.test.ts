import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/posts/[id]/reactions/route'
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

describe('Reactions API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should add a new reaction', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'posts') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { family_id: 'family-1' },
                error: null,
              }),
            }),
          }),
        }
      }
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
      if (table === 'reactions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({
                data: {
                  id: 'reaction-1',
                  post_id: 'post-1',
                  user_id: 'user-1',
                  type: 'heart',
                  created_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    })

    const request = new NextRequest('http://localhost/api/posts/post-1/reactions', {
      method: 'POST',
      body: JSON.stringify({ type: 'heart' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'post-1' }) })
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.action).toBe('added')
    expect(data.type).toBe('heart')
  })

  it('should remove reaction when clicking same type', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'posts') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { family_id: 'family-1' },
                error: null,
              }),
            }),
          }),
        }
      }
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
      if (table === 'reactions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: {
                    id: 'reaction-1',
                    post_id: 'post-1',
                    user_id: 'user-1',
                    type: 'heart',
                  },
                  error: null,
                }),
              }),
            }),
          }),
          delete: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        }
      }
      return {}
    })

    const request = new NextRequest('http://localhost/api/posts/post-1/reactions', {
      method: 'POST',
      body: JSON.stringify({ type: 'heart' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'post-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.action).toBe('removed')
    expect(data.type).toBe('heart')
  })

  it('should update reaction when clicking different type', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'posts') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { family_id: 'family-1' },
                error: null,
              }),
            }),
          }),
        }
      }
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
      if (table === 'reactions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: {
                    id: 'reaction-1',
                    post_id: 'post-1',
                    user_id: 'user-1',
                    type: 'heart',
                  },
                  error: null,
                }),
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({
                  data: {
                    id: 'reaction-1',
                    post_id: 'post-1',
                    user_id: 'user-1',
                    type: 'haha',
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }
      }
      return {}
    })

    const request = new NextRequest('http://localhost/api/posts/post-1/reactions', {
      method: 'POST',
      body: JSON.stringify({ type: 'haha' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'post-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.action).toBe('updated')
    expect(data.type).toBe('haha')
  })

  it('should return 401 when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated'),
    })

    const request = new NextRequest('http://localhost/api/posts/post-1/reactions', {
      method: 'POST',
      body: JSON.stringify({ type: 'heart' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'post-1' }) })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 400 when type is invalid', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    const request = new NextRequest('http://localhost/api/posts/post-1/reactions', {
      method: 'POST',
      body: JSON.stringify({ type: 'invalid' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'post-1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Invalid type')
  })

  it('should return 404 when post not found', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'posts') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }
      }
      return {}
    })

    const request = new NextRequest('http://localhost/api/posts/post-1/reactions', {
      method: 'POST',
      body: JSON.stringify({ type: 'heart' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'post-1' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Post not found')
  })

  it('should return 403 when user is not a family member', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'posts') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { family_id: 'family-1' },
                error: null,
              }),
            }),
          }),
        }
      }
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

    const request = new NextRequest('http://localhost/api/posts/post-1/reactions', {
      method: 'POST',
      body: JSON.stringify({ type: 'heart' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'post-1' }) })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toContain('not a member')
  })
})
