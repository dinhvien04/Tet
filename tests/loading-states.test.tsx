import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { LoadingOverlay } from '@/components/ui/loading-overlay'
import { PostCardSkeleton } from '@/components/skeletons/PostCardSkeleton'
import { PhotoGridSkeleton } from '@/components/skeletons/PhotoGridSkeleton'
import { EventCardSkeleton } from '@/components/skeletons/EventCardSkeleton'
import { NotificationSkeleton } from '@/components/skeletons/NotificationSkeleton'

describe('Loading State Components', () => {
  describe('Skeleton', () => {
    it('should render with default classes', () => {
      const { container } = render(<Skeleton />)
      const skeleton = container.firstChild as HTMLElement
      
      expect(skeleton).toHaveClass('animate-pulse')
      expect(skeleton).toHaveClass('rounded-md')
      expect(skeleton).toHaveClass('bg-muted')
    })

    it('should accept custom className', () => {
      const { container } = render(<Skeleton className="h-10 w-10" />)
      const skeleton = container.firstChild as HTMLElement
      
      expect(skeleton).toHaveClass('h-10')
      expect(skeleton).toHaveClass('w-10')
    })
  })

  describe('LoadingSpinner', () => {
    it('should render spinner with default size', () => {
      const { container } = render(<LoadingSpinner />)
      
      expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('should render with text', () => {
      render(<LoadingSpinner text="Loading..." />)
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should render with different sizes', () => {
      const { container: smallContainer } = render(<LoadingSpinner size="sm" />)
      const { container: largeContainer } = render(<LoadingSpinner size="lg" />)
      
      const smallSpinner = smallContainer.querySelector('.animate-spin')
      const largeSpinner = largeContainer.querySelector('.animate-spin')
      
      expect(smallSpinner).toHaveClass('h-4')
      expect(largeSpinner).toHaveClass('h-8')
    })
  })

  describe('LoadingOverlay', () => {
    it('should not render when isLoading is false', () => {
      const { container } = render(<LoadingOverlay isLoading={false} />)
      
      expect(container.firstChild).toBeNull()
    })

    it('should render when isLoading is true', () => {
      const { container } = render(<LoadingOverlay isLoading={true} />)
      
      expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('should render with text', () => {
      render(<LoadingOverlay isLoading={true} text="Processing..." />)
      
      expect(screen.getByText('Processing...')).toBeInTheDocument()
    })

    it('should have backdrop blur', () => {
      const { container } = render(<LoadingOverlay isLoading={true} />)
      const overlay = container.firstChild as HTMLElement
      
      expect(overlay).toHaveClass('backdrop-blur-sm')
    })
  })

  describe('PostCardSkeleton', () => {
    it('should render post card skeleton structure', () => {
      const { container } = render(<PostCardSkeleton />)
      const skeletons = container.querySelectorAll('.animate-pulse')
      
      // Should have multiple skeleton elements (avatar, name, time, content, reactions)
      expect(skeletons.length).toBeGreaterThan(5)
    })

    it('should have rounded avatar skeleton', () => {
      const { container } = render(<PostCardSkeleton />)
      const roundedSkeleton = container.querySelector('.rounded-full')
      
      expect(roundedSkeleton).toBeInTheDocument()
    })
  })

  describe('PhotoGridSkeleton', () => {
    it('should render default number of skeletons', () => {
      const { container } = render(<PhotoGridSkeleton />)
      const skeletons = container.querySelectorAll('.animate-pulse')
      
      expect(skeletons.length).toBe(8)
    })

    it('should render custom number of skeletons', () => {
      const { container } = render(<PhotoGridSkeleton count={4} />)
      const skeletons = container.querySelectorAll('.animate-pulse')
      
      expect(skeletons.length).toBe(4)
    })

    it('should use grid layout', () => {
      const { container } = render(<PhotoGridSkeleton />)
      const grid = container.firstChild as HTMLElement
      
      expect(grid).toHaveClass('grid')
    })

    it('should have aspect-square items', () => {
      const { container } = render(<PhotoGridSkeleton count={2} />)
      const items = container.querySelectorAll('.aspect-square')
      
      expect(items.length).toBe(2)
    })
  })

  describe('EventCardSkeleton', () => {
    it('should render event card skeleton structure', () => {
      const { container } = render(<EventCardSkeleton />)
      const skeletons = container.querySelectorAll('.animate-pulse')
      
      // Should have multiple skeleton elements (title, date, location, tasks)
      expect(skeletons.length).toBeGreaterThan(4)
    })

    it('should be wrapped in card styling', () => {
      const { container } = render(<EventCardSkeleton />)
      const card = container.firstChild as HTMLElement
      
      expect(card).toHaveClass('rounded-lg')
      expect(card).toHaveClass('border')
    })
  })

  describe('NotificationSkeleton', () => {
    it('should render notification skeleton structure', () => {
      const { container } = render(<NotificationSkeleton />)
      const skeletons = container.querySelectorAll('.animate-pulse')
      
      // Should have multiple skeleton elements (avatar, title, content, time)
      expect(skeletons.length).toBeGreaterThan(3)
    })

    it('should have rounded avatar skeleton', () => {
      const { container } = render(<NotificationSkeleton />)
      const roundedSkeleton = container.querySelector('.rounded-full')
      
      expect(roundedSkeleton).toBeInTheDocument()
    })

    it('should use flex layout', () => {
      const { container } = render(<NotificationSkeleton />)
      const wrapper = container.firstChild as HTMLElement
      
      expect(wrapper).toHaveClass('flex')
    })
  })

  describe('Skeleton Accessibility', () => {
    it('should have appropriate ARIA attributes', () => {
      const { container } = render(
        <div aria-busy="true" aria-label="Loading content">
          <PostCardSkeleton />
        </div>
      )
      
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveAttribute('aria-busy', 'true')
      expect(wrapper).toHaveAttribute('aria-label', 'Loading content')
    })
  })

  describe('Animation Performance', () => {
    it('should use CSS animation classes', () => {
      const { container } = render(<Skeleton />)
      const skeleton = container.firstChild as HTMLElement
      
      // animate-pulse uses CSS animations, not JavaScript
      expect(skeleton).toHaveClass('animate-pulse')
    })

    it('should not cause layout shifts', () => {
      const { container } = render(<PhotoGridSkeleton count={4} />)
      const items = container.querySelectorAll('.aspect-square')
      
      // aspect-square maintains aspect ratio, preventing layout shifts
      items.forEach(item => {
        expect(item).toHaveClass('aspect-square')
      })
    })
  })
})
