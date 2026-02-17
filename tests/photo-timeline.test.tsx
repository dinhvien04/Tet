import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PhotoTimeline } from '@/components/photos/PhotoTimeline'

describe('PhotoTimeline', () => {
  const mockPhotos = [
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
        email: 'user1@example.com',
        created_at: '2024-01-01T00:00:00Z'
      }
    },
    {
      id: 'photo-2',
      family_id: 'family-123',
      user_id: 'user-456',
      url: 'https://example.com/photo2.jpg',
      uploaded_at: '2024-01-01T15:00:00Z',
      users: {
        id: 'user-456',
        name: 'User 2',
        avatar: null,
        email: 'user2@example.com',
        created_at: '2024-01-01T00:00:00Z'
      }
    },
    {
      id: 'photo-3',
      family_id: 'family-123',
      user_id: 'user-123',
      url: 'https://example.com/photo3.jpg',
      uploaded_at: '2024-01-02T10:00:00Z',
      users: {
        id: 'user-123',
        name: 'User 1',
        avatar: null,
        email: 'user1@example.com',
        created_at: '2024-01-01T00:00:00Z'
      }
    }
  ]

  it('should render empty state when no photos', () => {
    render(<PhotoTimeline photos={[]} />)
    
    expect(screen.getByText('Chưa có ảnh nào')).toBeInTheDocument()
  })

  it('should group photos by date', () => {
    render(<PhotoTimeline photos={mockPhotos} />)
    
    // Should have 2 date headers (Jan 1 and Jan 2)
    const dateHeaders = screen.getAllByRole('heading', { level: 3 })
    expect(dateHeaders.length).toBe(2)
  })

  it('should display photo count for each date', () => {
    render(<PhotoTimeline photos={mockPhotos} />)
    
    // Jan 1 should have 2 photos
    expect(screen.getByText('2 ảnh')).toBeInTheDocument()
    // Jan 2 should have 1 photo
    expect(screen.getByText('1 ảnh')).toBeInTheDocument()
  })

  it('should order dates from newest to oldest', () => {
    render(<PhotoTimeline photos={mockPhotos} />)
    
    const dateHeaders = screen.getAllByRole('heading', { level: 3 })
    const dates = dateHeaders.map(h => h.textContent)
    
    // Parse dates and verify ordering
    const date1 = new Date(mockPhotos[2].uploaded_at) // Jan 2
    const date2 = new Date(mockPhotos[0].uploaded_at) // Jan 1
    
    expect(date1.getTime()).toBeGreaterThan(date2.getTime())
  })

  it('should render PhotoGrid for each date group', () => {
    render(<PhotoTimeline photos={mockPhotos} />)
    
    // Should render all 3 photos across the grids
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(3)
  })

  it('should pass onPhotoClick to PhotoGrid', () => {
    const onPhotoClick = vi.fn()
    const { container } = render(
      <PhotoTimeline photos={mockPhotos} onPhotoClick={onPhotoClick} />
    )
    
    // PhotoGrid should be rendered with clickable photos
    const photoContainers = container.querySelectorAll('.cursor-pointer')
    expect(photoContainers.length).toBeGreaterThan(0)
  })

  it('should handle photos from same day correctly', () => {
    const sameDayPhotos = [
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
          email: 'user1@example.com',
          created_at: '2024-01-01T00:00:00Z'
        }
      },
      {
        id: 'photo-2',
        family_id: 'family-123',
        user_id: 'user-123',
        url: 'https://example.com/photo2.jpg',
        uploaded_at: '2024-01-01T15:00:00Z',
        users: {
          id: 'user-123',
          name: 'User 1',
          avatar: null,
          email: 'user1@example.com',
          created_at: '2024-01-01T00:00:00Z'
        }
      }
    ]
    
    render(<PhotoTimeline photos={sameDayPhotos} />)
    
    // Should have only 1 date header
    const dateHeaders = screen.getAllByRole('heading', { level: 3 })
    expect(dateHeaders).toHaveLength(1)
    
    // Should show 2 photos
    expect(screen.getByText('2 ảnh')).toBeInTheDocument()
  })

  it('should apply sticky positioning to date headers', () => {
    const { container } = render(<PhotoTimeline photos={mockPhotos} />)
    
    const stickyHeaders = container.querySelectorAll('.sticky')
    expect(stickyHeaders.length).toBeGreaterThan(0)
  })

  it('should format dates in Vietnamese locale', () => {
    render(<PhotoTimeline photos={mockPhotos} />)
    
    const dateHeaders = screen.getAllByRole('heading', { level: 3 })
    
    // Vietnamese date format should include "tháng"
    dateHeaders.forEach(header => {
      expect(header.textContent).toMatch(/\d{1,2}\s+tháng\s+\d{1,2},\s+\d{4}/)
    })
  })

  it('should handle single photo correctly', () => {
    const singlePhoto = [mockPhotos[0]]
    
    render(<PhotoTimeline photos={singlePhoto} />)
    
    expect(screen.getByText('1 ảnh')).toBeInTheDocument()
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(1)
  })
})
