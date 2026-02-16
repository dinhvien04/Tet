import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { PostFeed } from '@/components/posts/PostFeed'

// Mock fetch
global.fetch = vi.fn()

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => ({
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  })),
}))

describe('PostFeed Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display loading state initially', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}))
    
    render(<PostFeed familyId="family-1" />)
    
    // Check for the loading spinner by class
    const loadingElement = document.querySelector('.animate-spin')
    expect(loadingElement).toBeInTheDocument()
  })

  it('should fetch and display posts', async () => {
    const mockPosts = [
      {
        id: 'post-1',
        family_id: 'family-1',
        user_id: 'user-1',
        content: 'Test post 1',
        type: 'loi-chuc',
        created_at: new Date().toISOString(),
        users: {
          id: 'user-1',
          name: 'User 1',
          avatar: null,
          email: 'user1@example.com'
        },
        reactions: { heart: 0, haha: 0 },
        userReaction: null
      },
      {
        id: 'post-2',
        family_id: 'family-1',
        user_id: 'user-2',
        content: 'Test post 2',
        type: 'cau-doi',
        created_at: new Date().toISOString(),
        users: {
          id: 'user-2',
          name: 'User 2',
          avatar: null,
          email: 'user2@example.com'
        },
        reactions: { heart: 0, haha: 0 },
        userReaction: null
      }
    ]

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPosts,
    } as Response)

    render(<PostFeed familyId="family-1" />)

    await waitFor(() => {
      expect(screen.getByText('Test post 1')).toBeInTheDocument()
      expect(screen.getByText('Test post 2')).toBeInTheDocument()
    })
  })

  it('should display error message when fetch fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    render(<PostFeed familyId="family-1" />)

    await waitFor(() => {
      expect(screen.getByText(/Không thể tải bài đăng/)).toBeInTheDocument()
    })
  })

  it('should display empty state when no posts', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    render(<PostFeed familyId="family-1" />)

    await waitFor(() => {
      expect(screen.getByText(/Chưa có bài đăng nào/)).toBeInTheDocument()
    })
  })

  it('should allow retry on error', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response)

    render(<PostFeed familyId="family-1" />)

    await waitFor(() => {
      expect(screen.getByText(/Không thể tải bài đăng/)).toBeInTheDocument()
    })

    const retryButton = screen.getByText('Thử lại')
    retryButton.click()

    await waitFor(() => {
      expect(screen.getByText(/Chưa có bài đăng nào/)).toBeInTheDocument()
    })
  })

  it('should call API with correct familyId', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    render(<PostFeed familyId="test-family-123" />)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/posts?familyId=test-family-123')
    })
  })
})
