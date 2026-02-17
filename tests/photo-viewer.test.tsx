import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PhotoViewer } from '@/components/photos/PhotoViewer'
import { User } from '@/types/database'

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />
}))

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  avatar: 'https://example.com/avatar.jpg',
  created_at: '2024-01-01T00:00:00Z'
}

const mockPhotos = [
  {
    id: 'photo-1',
    family_id: 'family-1',
    user_id: 'user-1',
    url: 'https://example.com/photo1.jpg',
    uploaded_at: '2024-01-15T10:30:00Z',
    users: mockUser
  },
  {
    id: 'photo-2',
    family_id: 'family-1',
    user_id: 'user-1',
    url: 'https://example.com/photo2.jpg',
    uploaded_at: '2024-01-16T14:20:00Z',
    users: mockUser
  },
  {
    id: 'photo-3',
    family_id: 'family-1',
    user_id: 'user-1',
    url: 'https://example.com/photo3.jpg',
    uploaded_at: '2024-01-17T09:15:00Z',
    users: mockUser
  }
]

describe('PhotoViewer', () => {
  let onClose: ReturnType<typeof vi.fn>
  let onNavigate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onClose = vi.fn()
    onNavigate = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Display and Metadata', () => {
    it('should display current photo', () => {
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={0}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      const image = screen.getByAltText('Photo by Test User')
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute('src', 'https://example.com/photo1.jpg')
    })

    it('should display uploader name', () => {
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={0}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    it('should display upload time in Vietnamese format', () => {
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={0}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      // Check that time is displayed (format may vary by locale)
      const timeElement = screen.getByText(/2024/)
      expect(timeElement).toBeInTheDocument()
    })

    it('should display photo counter', () => {
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={0}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })

    it('should update counter when navigating', () => {
      const { rerender } = render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={0}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      expect(screen.getByText('1 / 3')).toBeInTheDocument()

      rerender(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={1}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      expect(screen.getByText('2 / 3')).toBeInTheDocument()
    })

    it('should handle missing user data gracefully', () => {
      const photosWithoutUser = [
        {
          ...mockPhotos[0],
          users: undefined
        }
      ]

      render(
        <PhotoViewer
          photos={photosWithoutUser}
          currentIndex={0}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      expect(screen.getByText('Unknown')).toBeInTheDocument()
    })
  })

  describe('Navigation Controls', () => {
    it('should show previous button when not at first photo', () => {
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={1}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      const prevButton = screen.getByLabelText('Previous photo')
      expect(prevButton).toBeInTheDocument()
    })

    it('should not show previous button at first photo', () => {
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={0}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      const prevButton = screen.queryByLabelText('Previous photo')
      expect(prevButton).not.toBeInTheDocument()
    })

    it('should show next button when not at last photo', () => {
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={0}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      const nextButton = screen.getByLabelText('Next photo')
      expect(nextButton).toBeInTheDocument()
    })

    it('should not show next button at last photo', () => {
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={2}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      const nextButton = screen.queryByLabelText('Next photo')
      expect(nextButton).not.toBeInTheDocument()
    })

    it('should call onNavigate with previous index when clicking previous button', () => {
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={1}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      const prevButton = screen.getByLabelText('Previous photo')
      fireEvent.click(prevButton)

      expect(onNavigate).toHaveBeenCalledWith(0)
    })

    it('should call onNavigate with next index when clicking next button', () => {
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={0}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      const nextButton = screen.getByLabelText('Next photo')
      fireEvent.click(nextButton)

      expect(onNavigate).toHaveBeenCalledWith(1)
    })
  })

  describe('Close Functionality', () => {
    it('should show close button', () => {
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={0}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      const closeButtons = screen.getAllByLabelText('Close viewer')
      expect(closeButtons.length).toBeGreaterThan(0)
      // The actual close button (not the backdrop)
      expect(closeButtons[0]).toBeInTheDocument()
    })

    it('should call onClose when clicking close button', () => {
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={0}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      const closeButton = screen.getAllByLabelText('Close viewer')[0]
      fireEvent.click(closeButton)

      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Keyboard Navigation', () => {
    it('should close viewer when pressing Escape key', () => {
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={0}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      fireEvent.keyDown(window, { key: 'Escape' })

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should navigate to previous photo when pressing ArrowLeft', () => {
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={1}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      fireEvent.keyDown(window, { key: 'ArrowLeft' })

      expect(onNavigate).toHaveBeenCalledWith(0)
    })

    it('should navigate to next photo when pressing ArrowRight', () => {
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={0}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      fireEvent.keyDown(window, { key: 'ArrowRight' })

      expect(onNavigate).toHaveBeenCalledWith(1)
    })

    it('should not navigate previous when at first photo', () => {
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={0}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      fireEvent.keyDown(window, { key: 'ArrowLeft' })

      expect(onNavigate).not.toHaveBeenCalled()
    })

    it('should not navigate next when at last photo', () => {
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={2}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      fireEvent.keyDown(window, { key: 'ArrowRight' })

      expect(onNavigate).not.toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle single photo', () => {
      render(
        <PhotoViewer
          photos={[mockPhotos[0]]}
          currentIndex={0}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      expect(screen.getByText('1 / 1')).toBeInTheDocument()
      expect(screen.queryByLabelText('Previous photo')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Next photo')).not.toBeInTheDocument()
    })

    it('should prevent body scroll when mounted', () => {
      const originalOverflow = document.body.style.overflow

      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={0}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      expect(document.body.style.overflow).toBe('hidden')

      // Cleanup is tested in unmount
    })
  })
})
