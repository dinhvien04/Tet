import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PhotoUploader } from '@/components/photos/PhotoUploader'
import { PhotoGrid } from '@/components/photos/PhotoGrid'
import { PhotoViewer } from '@/components/photos/PhotoViewer'
import { PhotoTimeline } from '@/components/photos/PhotoTimeline'

/**
 * Integration tests for Photo Module
 * **Validates: Requirements 10.3, 10.7, 11.3, 11.5**
 * 
 * This test suite validates the complete photo module functionality:
 * - File validation (10.3): jpg, png, heic formats
 * - Error handling (10.7): Invalid files and files > 10MB
 * - Photo viewing (11.3): Clicking photo opens full view
 * - Navigation (11.5): Previous/next photo navigation
 */

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />
}))

describe('Photo Module Integration Tests', () => {
  const mockFamilyId = 'family-123'
  const mockPhotos = [
    {
      id: 'photo-1',
      family_id: mockFamilyId,
      user_id: 'user-1',
      url: 'https://example.com/photo1.jpg',
      uploaded_at: '2024-01-15T10:00:00Z',
      users: {
        id: 'user-1',
        name: 'Test User',
        avatar: 'https://example.com/avatar.jpg',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z'
      }
    },
    {
      id: 'photo-2',
      family_id: mockFamilyId,
      user_id: 'user-1',
      url: 'https://example.com/photo2.jpg',
      uploaded_at: '2024-01-15T14:00:00Z',
      users: {
        id: 'user-1',
        name: 'Test User',
        avatar: 'https://example.com/avatar.jpg',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z'
      }
    },
    {
      id: 'photo-3',
      family_id: mockFamilyId,
      user_id: 'user-1',
      url: 'https://example.com/photo3.jpg',
      uploaded_at: '2024-01-16T10:00:00Z',
      users: {
        id: 'user-1',
        name: 'Test User',
        avatar: 'https://example.com/avatar.jpg',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z'
      }
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('File Validation - Requirement 10.3', () => {
    it('should accept valid image formats (jpg, png, heic)', async () => {
      const { toast } = await import('sonner')
      const validFormats = [
        { name: 'test.jpg', type: 'image/jpeg' },
        { name: 'test.png', type: 'image/png' },
        { name: 'test.heic', type: 'image/heic' }
      ]

      for (const format of validFormats) {
        const { unmount } = render(<PhotoUploader familyId={mockFamilyId} />)
        
        const file = new File(['test'], format.name, { type: format.type })
        const fileInput = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement

        Object.defineProperty(fileInput, 'files', {
          value: [file],
          writable: false,
        })

        fireEvent.change(fileInput)

        await waitFor(() => {
          expect(screen.getByText(format.name)).toBeInTheDocument()
        })

        // Should not show error for valid formats
        expect(toast.error).not.toHaveBeenCalled()
        
        unmount()
        vi.clearAllMocks()
      }
    })

    it('should reject invalid file formats', async () => {
      const { toast } = await import('sonner')
      const invalidFormats = [
        { name: 'test.pdf', type: 'application/pdf' },
        { name: 'test.doc', type: 'application/msword' },
        { name: 'test.txt', type: 'text/plain' },
        { name: 'test.gif', type: 'image/gif' }
      ]

      for (const format of invalidFormats) {
        const { unmount } = render(<PhotoUploader familyId={mockFamilyId} />)
        
        const file = new File(['test'], format.name, { type: format.type })
        const fileInput = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement

        Object.defineProperty(fileInput, 'files', {
          value: [file],
          writable: false,
        })

        fireEvent.change(fileInput)

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith('Định dạng file không hợp lệ. Chỉ chấp nhận JPG, PNG, HEIC.')
        })
        
        unmount()
        vi.clearAllMocks()
      }
    })
  })

  describe('Error Handling - Requirement 10.7', () => {
    it('should reject files larger than 10MB', async () => {
      const { toast } = await import('sonner')
      render(<PhotoUploader familyId={mockFamilyId} />)

      // Create a file larger than 10MB
      const largeBuffer = new ArrayBuffer(11 * 1024 * 1024)
      const file = new File([largeBuffer], 'large.jpg', { type: 'image/jpeg' })
      
      const fileInput = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('File quá lớn. Kích thước tối đa 10MB.')
      })
    })

    it('should accept files exactly at 10MB limit', async () => {
      const { toast } = await import('sonner')
      render(<PhotoUploader familyId={mockFamilyId} />)

      // Create a file exactly 10MB
      const buffer = new ArrayBuffer(10 * 1024 * 1024)
      const file = new File([buffer], 'exact.jpg', { type: 'image/jpeg' })
      
      const fileInput = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(screen.getByText('exact.jpg')).toBeInTheDocument()
      })

      // Should not show error for file at limit
      expect(toast.error).not.toHaveBeenCalled()
    })

    it('should handle upload API errors gracefully', async () => {
      const { toast } = await import('sonner')
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Storage quota exceeded' }),
      } as Response)

      render(<PhotoUploader familyId={mockFamilyId} />)

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const fileInput = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(screen.getByText('Upload ảnh')).toBeInTheDocument()
      })

      const uploadButton = screen.getByText('Upload ảnh')
      fireEvent.click(uploadButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Storage quota exceeded')
      })
    })
  })

  describe('Photo Grid and Viewing - Requirement 11.3', () => {
    it('should display photos in a grid', () => {
      render(<PhotoGrid photos={mockPhotos} />)

      const images = screen.getAllByRole('img')
      expect(images).toHaveLength(3)
      
      // Verify all photos are displayed
      expect(images[0]).toHaveAttribute('src', 'https://example.com/photo1.jpg')
      expect(images[1]).toHaveAttribute('src', 'https://example.com/photo2.jpg')
      expect(images[2]).toHaveAttribute('src', 'https://example.com/photo3.jpg')
    })

    it('should open full view when clicking a photo', () => {
      const onPhotoClick = vi.fn()
      render(<PhotoGrid photos={mockPhotos} onPhotoClick={onPhotoClick} />)

      const images = screen.getAllByRole('img')
      const firstPhotoContainer = images[0].closest('div')
      
      if (firstPhotoContainer) {
        fireEvent.click(firstPhotoContainer)
      }

      expect(onPhotoClick).toHaveBeenCalledWith(mockPhotos[0], 0)
    })

    it('should pass correct photo index when clicking', () => {
      const onPhotoClick = vi.fn()
      render(<PhotoGrid photos={mockPhotos} onPhotoClick={onPhotoClick} />)

      const images = screen.getAllByRole('img')
      
      // Click second photo
      const secondPhotoContainer = images[1].closest('div')
      if (secondPhotoContainer) {
        fireEvent.click(secondPhotoContainer)
      }

      expect(onPhotoClick).toHaveBeenCalledWith(mockPhotos[1], 1)
    })

    it('should display photo metadata in full view', () => {
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={0}
          onClose={vi.fn()}
          onNavigate={vi.fn()}
        />
      )

      // Should display uploader name
      expect(screen.getByText('Test User')).toBeInTheDocument()
      
      // Should display photo counter
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })
  })

  describe('Photo Navigation - Requirement 11.5', () => {
    it('should navigate to next photo', () => {
      const onNavigate = vi.fn()
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={0}
          onClose={vi.fn()}
          onNavigate={onNavigate}
        />
      )

      const nextButton = screen.getByLabelText('Next photo')
      fireEvent.click(nextButton)

      expect(onNavigate).toHaveBeenCalledWith(1)
    })

    it('should navigate to previous photo', () => {
      const onNavigate = vi.fn()
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={1}
          onClose={vi.fn()}
          onNavigate={onNavigate}
        />
      )

      const prevButton = screen.getByLabelText('Previous photo')
      fireEvent.click(prevButton)

      expect(onNavigate).toHaveBeenCalledWith(0)
    })

    it('should not show previous button on first photo', () => {
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={0}
          onClose={vi.fn()}
          onNavigate={vi.fn()}
        />
      )

      const prevButton = screen.queryByLabelText('Previous photo')
      expect(prevButton).not.toBeInTheDocument()
    })

    it('should not show next button on last photo', () => {
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={2}
          onClose={vi.fn()}
          onNavigate={vi.fn()}
        />
      )

      const nextButton = screen.queryByLabelText('Next photo')
      expect(nextButton).not.toBeInTheDocument()
    })

    it('should support keyboard navigation with arrow keys', () => {
      const onNavigate = vi.fn()
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={1}
          onClose={vi.fn()}
          onNavigate={onNavigate}
        />
      )

      // Navigate with left arrow
      fireEvent.keyDown(window, { key: 'ArrowLeft' })
      expect(onNavigate).toHaveBeenCalledWith(0)

      vi.clearAllMocks()

      // Navigate with right arrow
      fireEvent.keyDown(window, { key: 'ArrowRight' })
      expect(onNavigate).toHaveBeenCalledWith(2)
    })

    it('should close viewer with Escape key', () => {
      const onClose = vi.fn()
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={0}
          onClose={onClose}
          onNavigate={vi.fn()}
        />
      )

      fireEvent.keyDown(window, { key: 'Escape' })
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('Photo Timeline Integration', () => {
    it('should group photos by date', () => {
      render(<PhotoTimeline photos={mockPhotos} />)

      // Should have 2 date groups (Jan 15 and Jan 16)
      const dateHeaders = screen.getAllByRole('heading', { level: 3 })
      expect(dateHeaders).toHaveLength(2)
    })

    it('should display correct photo count per date', () => {
      render(<PhotoTimeline photos={mockPhotos} />)

      // Jan 15 should have 2 photos
      expect(screen.getByText('2 ảnh')).toBeInTheDocument()
      // Jan 16 should have 1 photo
      expect(screen.getByText('1 ảnh')).toBeInTheDocument()
    })

    it('should integrate with PhotoGrid for each date group', () => {
      const onPhotoClick = vi.fn()
      render(<PhotoTimeline photos={mockPhotos} onPhotoClick={onPhotoClick} />)

      const images = screen.getAllByRole('img')
      expect(images).toHaveLength(3)

      // Click a photo
      const firstPhotoContainer = images[0].closest('div')
      if (firstPhotoContainer) {
        fireEvent.click(firstPhotoContainer)
      }

      expect(onPhotoClick).toHaveBeenCalled()
    })
  })

  describe('Upload Progress Display', () => {
    it('should show uploading state during upload', async () => {
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ id: 'photo-123' }),
            } as Response)
          }, 1000)
        })
      )

      render(<PhotoUploader familyId={mockFamilyId} />)

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const fileInput = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(screen.getByText('Upload ảnh')).toBeInTheDocument()
      })

      const uploadButton = screen.getByText('Upload ảnh')
      fireEvent.click(uploadButton)

      await waitFor(() => {
        const uploadingElements = screen.getAllByText(/Đang upload\.\.\./)
        expect(uploadingElements.length).toBeGreaterThan(0)
      })
    })

    it('should disable upload button during upload', async () => {
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ id: 'photo-123' }),
            } as Response)
          }, 1000)
        })
      )

      render(<PhotoUploader familyId={mockFamilyId} />)

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const fileInput = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(screen.getByText('Upload ảnh')).toBeInTheDocument()
      })

      const uploadButton = screen.getByText('Upload ảnh')
      fireEvent.click(uploadButton)

      await waitFor(() => {
        const uploadingElements = screen.getAllByText(/Đang upload\.\.\./)
        const button = uploadingElements.find(el => el.closest('button'))?.closest('button')
        expect(button).toBeDisabled()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty photo list', () => {
      render(<PhotoGrid photos={[]} />)
      expect(screen.getByText('Chưa có ảnh nào')).toBeInTheDocument()
    })

    it('should handle single photo in viewer', () => {
      render(
        <PhotoViewer
          photos={[mockPhotos[0]]}
          currentIndex={0}
          onClose={vi.fn()}
          onNavigate={vi.fn()}
        />
      )

      expect(screen.getByText('1 / 1')).toBeInTheDocument()
      expect(screen.queryByLabelText('Previous photo')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Next photo')).not.toBeInTheDocument()
    })

    it('should handle photos without user metadata', () => {
      const photosWithoutUser = [
        {
          ...mockPhotos[0],
          users: undefined
        }
      ]

      render(<PhotoGrid photos={photosWithoutUser} />)
      expect(screen.getByText('Unknown')).toBeInTheDocument()
    })

    it('should handle canceling file selection', async () => {
      render(<PhotoUploader familyId={mockFamilyId} />)

      const file1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' })
      const fileInput = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement

      // First file
      Object.defineProperty(fileInput, 'files', {
        value: [file1],
        writable: false,
      })

      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(screen.getByText('test1.jpg')).toBeInTheDocument()
      })

      // Cancel file selection
      const cancelButton = screen.getByText('Hủy')
      fireEvent.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText('test1.jpg')).not.toBeInTheDocument()
        expect(screen.getByText('Kéo thả ảnh vào đây')).toBeInTheDocument()
      })
    })
  })
})
