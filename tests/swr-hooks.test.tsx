import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import { usePosts, useOptimisticPost } from '@/lib/hooks/usePosts'
import { usePhotos, useOptimisticPhoto } from '@/lib/hooks/usePhotos'
import { useEvents } from '@/lib/hooks/useEvents'
import { useNotifications, useOptimisticNotification } from '@/lib/hooks/useNotifications'

// Mock fetch
global.fetch = vi.fn()

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch')
  }
  return res.json()
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ 
    provider: () => new Map(), 
    dedupingInterval: 0,
    fetcher
  }}>
    {children}
  </SWRConfig>
)

describe('usePosts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch posts successfully', async () => {
    const mockPosts = [
      { id: '1', content: 'Test post', family_id: 'family-1', user_id: 'user-1' }
    ]

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPosts,
    })

    const { result } = renderHook(() => usePosts('family-1'), { wrapper })

    await waitFor(() => {
      expect(result.current.posts).toEqual(mockPosts)
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should handle fetch errors', async () => {
    ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => usePosts('family-1'), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBeTruthy()
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should optimistically add post', async () => {
    const mockPosts = [
      { id: '1', content: 'Existing post', family_id: 'family-1', user_id: 'user-1' }
    ]

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPosts,
    })

    const { result } = renderHook(() => {
      const posts = usePosts('family-1')
      const optimistic = useOptimisticPost()
      return { ...posts, ...optimistic }
    }, { wrapper })

    await waitFor(() => {
      expect(result.current.posts).toEqual(mockPosts)
    })

    const newPost = {
      id: '2',
      content: 'New post',
      family_id: 'family-1',
      user_id: 'user-1',
      reactions: { heart: 0, haha: 0 },
      userReaction: null,
    }

    // Add post optimistically
    result.current.addPost('family-1', newPost as any, result.current.mutate)

    await waitFor(() => {
      expect(result.current.posts).toHaveLength(2)
      expect(result.current.posts?.[0]).toEqual(newPost)
    })
  })
})

describe('usePhotos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch photos successfully', async () => {
    const mockPhotos = [
      { id: '1', url: 'https://example.com/photo.jpg', family_id: 'family-1', user_id: 'user-1', uploaded_at: new Date().toISOString() }
    ]

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPhotos,
    })

    const { result } = renderHook(() => usePhotos('family-1'), { wrapper })

    await waitFor(() => {
      expect(result.current.photos).toEqual(mockPhotos)
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should optimistically add photo', async () => {
    const mockPhotos = [
      { id: '1', url: 'https://example.com/photo1.jpg', family_id: 'family-1', user_id: 'user-1', uploaded_at: new Date().toISOString() }
    ]

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPhotos,
    })

    const { result } = renderHook(() => {
      const photos = usePhotos('family-1')
      const optimistic = useOptimisticPhoto()
      return { ...photos, ...optimistic }
    }, { wrapper })

    await waitFor(() => {
      expect(result.current.photos).toEqual(mockPhotos)
    })

    const newPhoto = {
      id: '2',
      url: 'https://example.com/photo2.jpg',
      family_id: 'family-1',
      user_id: 'user-1',
      uploaded_at: new Date().toISOString(),
    }

    // Add photo optimistically
    result.current.addPhoto('family-1', newPhoto, result.current.mutate)

    await waitFor(() => {
      expect(result.current.photos).toHaveLength(2)
      expect(result.current.photos?.[0]).toEqual(newPhoto)
    })
  })
})

describe('useEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch events successfully', async () => {
    const mockEvents = [
      { 
        id: '1', 
        title: 'Tết Event', 
        date: new Date().toISOString(), 
        location: 'Home',
        family_id: 'family-1',
        created_by: 'user-1',
        created_at: new Date().toISOString()
      }
    ]

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEvents,
    })

    const { result } = renderHook(() => useEvents('family-1'), { wrapper })

    await waitFor(() => {
      expect(result.current.events).toEqual(mockEvents)
      expect(result.current.isLoading).toBe(false)
    })
  })
})

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch notifications successfully', async () => {
    const mockNotifications = [
      { 
        id: '1', 
        user_id: 'user-1',
        type: 'event_reminder' as const,
        title: 'Event reminder',
        content: 'Event starting soon',
        link: '/events/1',
        read: false,
        created_at: new Date().toISOString()
      }
    ]

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockNotifications,
    })

    const { result } = renderHook(() => useNotifications('user-1'), { wrapper })

    await waitFor(() => {
      expect(result.current.notifications).toEqual(mockNotifications)
      expect(result.current.unreadCount).toBe(1)
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should calculate unread count correctly', async () => {
    const mockNotifications = [
      { 
        id: '1', 
        user_id: 'user-1',
        type: 'event_reminder' as const,
        title: 'Event 1',
        content: 'Content 1',
        link: '/events/1',
        read: false,
        created_at: new Date().toISOString()
      },
      { 
        id: '2', 
        user_id: 'user-1',
        type: 'task_reminder' as const,
        title: 'Task 1',
        content: 'Content 2',
        link: '/events/2',
        read: true,
        created_at: new Date().toISOString()
      },
      { 
        id: '3', 
        user_id: 'user-1',
        type: 'event_reminder' as const,
        title: 'Event 2',
        content: 'Content 3',
        link: '/events/3',
        read: false,
        created_at: new Date().toISOString()
      }
    ]

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockNotifications,
    })

    const { result } = renderHook(() => useNotifications('user-1'), { wrapper })

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(2)
    })
  })

  it('should optimistically mark notification as read', async () => {
    const mockNotifications = [
      { 
        id: '1', 
        user_id: 'user-1',
        type: 'event_reminder' as const,
        title: 'Event reminder',
        content: 'Event starting soon',
        link: '/events/1',
        read: false,
        created_at: new Date().toISOString()
      }
    ]

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockNotifications,
    })

    const { result } = renderHook(() => {
      const notifications = useNotifications('user-1')
      const optimistic = useOptimisticNotification()
      return { ...notifications, ...optimistic }
    }, { wrapper })

    await waitFor(() => {
      expect(result.current.notifications).toEqual(mockNotifications)
      expect(result.current.unreadCount).toBe(1)
    })

    // Mark as read optimistically
    result.current.markAsRead('user-1', '1', result.current.mutate)

    await waitFor(() => {
      expect(result.current.notifications?.[0].read).toBe(true)
      expect(result.current.unreadCount).toBe(0)
    })
  })
})

describe('Cache Deduplication', () => {
  it('should deduplicate concurrent requests', async () => {
    const mockPosts = [
      { id: '1', content: 'Test post', family_id: 'family-1', user_id: 'user-1' }
    ]

    let fetchCount = 0
    ;(global.fetch as any).mockImplementation(() => {
      fetchCount++
      return Promise.resolve({
        ok: true,
        json: async () => mockPosts,
      })
    })

    // Render multiple hooks with same key simultaneously
    const { result: result1 } = renderHook(() => usePosts('family-1'), { wrapper })
    const { result: result2 } = renderHook(() => usePosts('family-1'), { wrapper })
    const { result: result3 } = renderHook(() => usePosts('family-1'), { wrapper })

    await waitFor(() => {
      expect(result1.current.posts).toEqual(mockPosts)
      expect(result2.current.posts).toEqual(mockPosts)
      expect(result3.current.posts).toEqual(mockPosts)
    })

    // Should only fetch once due to deduplication
    expect(fetchCount).toBe(1)
  })
})
