import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PhotoGrid } from '@/components/photos/PhotoGrid'

describe('PhotoGrid', () => {
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
      uploaded_at: '2024-01-02T10:00:00Z',
      users: {
        id: 'user-456',
        name: 'User 2',
        avatar: 'https://example.com/avatar.jpg',
        email: 'user2@example.com',
        created_at: '2024-01-01T00:00:00Z'
      }
    }
  ]

  it('should render empty state when no photos', () => {
    render(<PhotoGrid photos={[]} />)
    
    expect(screen.getByText('Chưa có ảnh nào')).toBeInTheDocument()
  })

  it('should render all photos in a grid', () => {
    render(<PhotoGrid photos={mockPhotos} />)
    
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(2)
  })

  it('should display user name on hover', () => {
    render(<PhotoGrid photos={mockPhotos} />)
    
    expect(screen.getByText('User 1')).toBeInTheDocument()
    expect(screen.getByText('User 2')).toBeInTheDocument()
  })

  it('should call onPhotoClick when photo is clicked', () => {
    const onPhotoClick = vi.fn()
    render(<PhotoGrid photos={mockPhotos} onPhotoClick={onPhotoClick} />)
    
    const photoContainers = screen.getAllByRole('img')[0].closest('div')
    if (photoContainers) {
      fireEvent.click(photoContainers)
    }
    
    expect(onPhotoClick).toHaveBeenCalledWith(mockPhotos[0], 0)
  })

  it('should pass correct index to onPhotoClick', () => {
    const onPhotoClick = vi.fn()
    render(<PhotoGrid photos={mockPhotos} onPhotoClick={onPhotoClick} />)
    
    const images = screen.getAllByRole('img')
    const secondPhotoContainer = images[1].closest('div')
    if (secondPhotoContainer) {
      fireEvent.click(secondPhotoContainer)
    }
    
    expect(onPhotoClick).toHaveBeenCalledWith(mockPhotos[1], 1)
  })

  it('should use lazy loading for images', () => {
    render(<PhotoGrid photos={mockPhotos} />)
    
    const images = screen.getAllByRole('img')
    images.forEach(img => {
      expect(img).toHaveAttribute('loading', 'lazy')
    })
  })

  it('should display skeleton loader before image loads', () => {
    const { container } = render(<PhotoGrid photos={mockPhotos} />)
    
    // Check for skeleton loader (animate-pulse class)
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('should handle photos without user information', () => {
    const photosWithoutUsers = [
      {
        id: 'photo-1',
        family_id: 'family-123',
        user_id: 'user-123',
        url: 'https://example.com/photo1.jpg',
        uploaded_at: '2024-01-01T10:00:00Z'
      }
    ]
    
    render(<PhotoGrid photos={photosWithoutUsers} />)
    
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('should apply responsive grid classes', () => {
    const { container } = render(<PhotoGrid photos={mockPhotos} />)
    
    const grid = container.querySelector('.grid')
    expect(grid).toHaveClass('grid-cols-2')
    expect(grid).toHaveClass('sm:grid-cols-3')
    expect(grid).toHaveClass('md:grid-cols-4')
    expect(grid).toHaveClass('lg:grid-cols-5')
  })

  it('should apply hover effects', () => {
    const { container } = render(<PhotoGrid photos={mockPhotos} />)
    
    const photoContainers = container.querySelectorAll('.group')
    expect(photoContainers.length).toBe(2)
  })
})
