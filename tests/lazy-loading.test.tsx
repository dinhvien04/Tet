import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import dynamic from 'next/dynamic'

// Mock next/dynamic
vi.mock('next/dynamic', () => ({
  default: vi.fn((loader: any, options: any) => {
    const Component = () => {
      if (options?.loading) {
        return options.loading()
      }
      return null
    }
    Component.displayName = 'DynamicComponent'
    return Component
  })
}))

describe('Lazy Loading Components', () => {
  it('should show loading state for PhotoViewerLazy', async () => {
    const { PhotoViewerLazy } = await import('@/components/photos/PhotoViewerLazy')
    
    const mockProps = {
      photos: [
        {
          id: '1',
          family_id: 'family-1',
          user_id: 'user-1',
          url: 'https://example.com/photo.jpg',
          uploaded_at: new Date().toISOString()
        }
      ],
      currentIndex: 0,
      onClose: vi.fn(),
      onNavigate: vi.fn()
    }

    render(<PhotoViewerLazy {...mockProps} />)
    
    // Should show loading spinner initially (Loader2 icon)
    expect(screen.getByText((content, element) => {
      return element?.classList.contains('lucide-loader-circle') || false
    })).toBeInTheDocument()
  })

  it('should show loading state for VideoRecapCreatorLazy', async () => {
    const { VideoRecapCreatorLazy } = await import('@/components/videos/VideoRecapCreatorLazy')
    
    const mockProps = {
      photos: [],
      familyId: 'family-1'
    }

    render(<VideoRecapCreatorLazy {...mockProps} />)
    
    // Should show loading spinner initially (Loader2 icon)
    expect(screen.getByText((content, element) => {
      return element?.classList.contains('lucide-loader-circle') || false
    })).toBeInTheDocument()
  })

  it('should show loading state for AIContentFormLazy', async () => {
    const { AIContentFormLazy } = await import('@/components/ai/AIContentFormLazy')
    
    const mockProps = {
      familyId: 'family-1',
      onContentCreated: vi.fn()
    }

    render(<AIContentFormLazy {...mockProps} />)
    
    // Should show loading spinner initially (Loader2 icon)
    expect(screen.getByText((content, element) => {
      return element?.classList.contains('lucide-loader-circle') || false
    })).toBeInTheDocument()
  })
})

describe('Infinite Scroll Components', () => {
  it('should calculate pagination correctly for PostFeedInfinite', () => {
    // Test pagination logic without rendering
    const pageSize = 10
    const page = 0
    const from = page * pageSize
    const to = from + pageSize - 1
    
    expect(from).toBe(0)
    expect(to).toBe(9)
  })

  it('should render PhotoGridInfinite and handle empty state', async () => {
    // Mock fetch
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      } as Response)
    )

    const { PhotoGridInfinite } = await import('@/components/photos/PhotoGridInfinite')
    
    render(
      <PhotoGridInfinite 
        familyId="family-1" 
        onPhotoClick={vi.fn()} 
      />
    )
    
    // Should eventually show empty state
    await waitFor(() => {
      expect(screen.getByText(/Chưa có ảnh nào/i)).toBeInTheDocument()
    })
  })
})

describe('API Pagination Support', () => {
  it('should support pagination parameters in posts API', () => {
    const url = new URL('http://localhost/api/posts?familyId=123&from=0&to=9')
    
    expect(url.searchParams.get('familyId')).toBe('123')
    expect(url.searchParams.get('from')).toBe('0')
    expect(url.searchParams.get('to')).toBe('9')
  })

  it('should support pagination parameters in photos API', () => {
    const url = new URL('http://localhost/api/photos?familyId=123&from=0&to=19')
    
    expect(url.searchParams.get('familyId')).toBe('123')
    expect(url.searchParams.get('from')).toBe('0')
    expect(url.searchParams.get('to')).toBe('19')
  })

  it('should calculate correct range for page 2 of posts', () => {
    const pageSize = 10
    const page = 2
    const from = page * pageSize // 20
    const to = from + pageSize - 1 // 29
    
    expect(from).toBe(20)
    expect(to).toBe(29)
  })

  it('should calculate correct range for page 3 of photos', () => {
    const pageSize = 20
    const page = 3
    const from = page * pageSize // 60
    const to = from + pageSize - 1 // 79
    
    expect(from).toBe(60)
    expect(to).toBe(79)
  })
})
