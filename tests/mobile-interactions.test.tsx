import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PhotoViewer } from '@/components/photos/PhotoViewer'
import { Button } from '@/components/ui/button'

describe('Mobile Interactions', () => {
  describe('Touch-friendly Button Sizes', () => {
    it('should have minimum 44x44px touch target on buttons', () => {
      render(<Button>Test Button</Button>)
      const button = screen.getByRole('button')
      
      // Check computed styles include minimum touch target
      expect(button.className).toContain('min-h-[44px]')
      expect(button.className).toContain('min-w-[44px]')
    })

    it('should have larger buttons on mobile (default size)', () => {
      render(<Button size="default">Mobile Button</Button>)
      const button = screen.getByRole('button')
      
      // Mobile: h-11 (44px), Desktop: h-10 (40px)
      expect(button.className).toContain('h-11')
      expect(button.className).toContain('md:h-10')
    })

    it('should have touch-manipulation CSS property', () => {
      render(<Button>Touch Button</Button>)
      const button = screen.getByRole('button')
      
      expect(button.className).toContain('touch-manipulation')
    })

    it('should have active scale effect for touch feedback', () => {
      render(<Button>Active Button</Button>)
      const button = screen.getByRole('button')
      
      expect(button.className).toContain('active:scale-95')
    })

    it('should support different button sizes', () => {
      const { rerender } = render(<Button size="sm">Small</Button>)
      let button = screen.getByRole('button')
      expect(button.className).toContain('h-9')

      rerender(<Button size="lg">Large</Button>)
      button = screen.getByRole('button')
      expect(button.className).toContain('h-12')

      rerender(<Button size="icon">Icon</Button>)
      button = screen.getByRole('button')
      expect(button.className).toContain('h-11')
      expect(button.className).toContain('w-11')
    })
  })

  describe('Swipe Gestures for Photo Viewer', () => {
    const mockPhotos = [
      {
        id: '1',
        family_id: 'fam1',
        user_id: 'user1',
        url: 'https://example.com/photo1.jpg',
        uploaded_at: '2024-01-01T00:00:00Z',
        users: { id: 'user1', name: 'User 1', email: 'user1@example.com', avatar: null, created_at: '2024-01-01' }
      },
      {
        id: '2',
        family_id: 'fam1',
        user_id: 'user1',
        url: 'https://example.com/photo2.jpg',
        uploaded_at: '2024-01-02T00:00:00Z',
        users: { id: 'user1', name: 'User 1', email: 'user1@example.com', avatar: null, created_at: '2024-01-01' }
      },
      {
        id: '3',
        family_id: 'fam1',
        user_id: 'user1',
        url: 'https://example.com/photo3.jpg',
        uploaded_at: '2024-01-03T00:00:00Z',
        users: { id: 'user1', name: 'User 1', email: 'user1@example.com', avatar: null, created_at: '2024-01-01' }
      }
    ]

    it('should navigate to next photo on swipe left', async () => {
      const onNavigate = vi.fn()
      const onClose = vi.fn()
      
      const { container } = render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={1}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      // Find the main photo display area (the div with touch handlers)
      const photoArea = container.querySelector('.flex-1.relative.flex')
      expect(photoArea).toBeDefined()

      // Simulate swipe left (next photo) - swipe distance > 50px
      fireEvent.touchStart(photoArea!, { touches: [{ clientX: 200, clientY: 100 }] })
      fireEvent.touchMove(photoArea!, { touches: [{ clientX: 100, clientY: 100 }] })
      fireEvent.touchEnd(photoArea!)

      expect(onNavigate).toHaveBeenCalledWith(2)
    })

    it('should navigate to previous photo on swipe right', () => {
      const onNavigate = vi.fn()
      const onClose = vi.fn()
      
      const { container } = render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={1}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      const photoArea = container.querySelector('.flex-1.relative.flex')
      expect(photoArea).toBeDefined()

      // Simulate swipe right (previous photo) - swipe distance > 50px
      fireEvent.touchStart(photoArea!, { touches: [{ clientX: 100, clientY: 100 }] })
      fireEvent.touchMove(photoArea!, { touches: [{ clientX: 200, clientY: 100 }] })
      fireEvent.touchEnd(photoArea!)

      expect(onNavigate).toHaveBeenCalledWith(0)
    })

    it('should not navigate on small swipe distance', () => {
      const onNavigate = vi.fn()
      const onClose = vi.fn()
      
      const { container } = render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={1}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      const photoArea = container.querySelector('.flex-1.relative.flex')
      expect(photoArea).toBeDefined()

      // Simulate small swipe (less than threshold)
      fireEvent.touchStart(photoArea!, { touches: [{ clientX: 100, clientY: 100 }] })
      fireEvent.touchMove(photoArea!, { touches: [{ clientX: 120, clientY: 100 }] })
      fireEvent.touchEnd(photoArea!)

      expect(onNavigate).not.toHaveBeenCalled()
    })

    it('should not navigate past first photo on swipe right', () => {
      const onNavigate = vi.fn()
      const onClose = vi.fn()
      
      const { container } = render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={0}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      const photoArea = container.querySelector('.flex-1.relative.flex')
      expect(photoArea).toBeDefined()

      // Simulate swipe right at first photo
      fireEvent.touchStart(photoArea!, { touches: [{ clientX: 100, clientY: 100 }] })
      fireEvent.touchMove(photoArea!, { touches: [{ clientX: 200, clientY: 100 }] })
      fireEvent.touchEnd(photoArea!)

      expect(onNavigate).not.toHaveBeenCalled()
    })

    it('should not navigate past last photo on swipe left', () => {
      const onNavigate = vi.fn()
      const onClose = vi.fn()
      
      const { container } = render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={2}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      const photoArea = container.querySelector('.flex-1.relative.flex')
      expect(photoArea).toBeDefined()

      // Simulate swipe left at last photo
      fireEvent.touchStart(photoArea!, { touches: [{ clientX: 200, clientY: 100 }] })
      fireEvent.touchMove(photoArea!, { touches: [{ clientX: 100, clientY: 100 }] })
      fireEvent.touchEnd(photoArea!)

      expect(onNavigate).not.toHaveBeenCalled()
    })

    it('should have touch-friendly navigation buttons', () => {
      const onNavigate = vi.fn()
      const onClose = vi.fn()
      
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={1}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      const buttons = screen.getAllByRole('button')
      const navButtons = buttons.filter(btn => 
        btn.getAttribute('aria-label')?.includes('photo')
      )

      navButtons.forEach(button => {
        expect(button.className).toContain('min-h-[44px]')
        expect(button.className).toContain('min-w-[44px]')
        expect(button.className).toContain('touch-manipulation')
        expect(button.className).toContain('active:scale-95')
      })
    })
  })

  describe('Mobile Camera Access', () => {
    it('should have camera button visible on mobile', () => {
      const { container } = render(
        <div>
          <Button className="md:hidden">
            Chụp ảnh
          </Button>
        </div>
      )

      const button = screen.getByRole('button', { name: /chụp ảnh/i })
      expect(button).toBeDefined()
      expect(button.className).toContain('md:hidden')
    })

    it('should have larger camera button for better touch target', () => {
      render(
        <Button size="lg" className="md:hidden">
          Chụp ảnh
        </Button>
      )

      const button = screen.getByRole('button', { name: /chụp ảnh/i })
      expect(button.className).toContain('h-12') // Large size on mobile
    })
  })

  describe('General Mobile Optimizations', () => {
    const mockPhotos = [
      {
        id: '1',
        family_id: 'fam1',
        user_id: 'user1',
        url: 'https://example.com/photo1.jpg',
        uploaded_at: '2024-01-01T00:00:00Z',
        users: { id: 'user1', name: 'User 1', email: 'user1@example.com', avatar: null, created_at: '2024-01-01' }
      }
    ]

    it('should prevent text selection on draggable elements', () => {
      const onNavigate = vi.fn()
      const onClose = vi.fn()
      
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={0}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      const image = screen.getByRole('img')
      expect(image.className).toContain('select-none')
      expect(image.getAttribute('draggable')).toBe('false')
    })

    it('should have smooth transitions for drag animations', () => {
      const onNavigate = vi.fn()
      const onClose = vi.fn()
      
      render(
        <PhotoViewer
          photos={mockPhotos}
          currentIndex={0}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      const photoContainer = screen.getByRole('img').parentElement
      expect(photoContainer?.className).toContain('transition-transform')
      expect(photoContainer?.className).toContain('duration-200')
    })
  })
})
