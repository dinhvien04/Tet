import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { OfflineIndicator, RealtimeStatusIndicator } from '@/components/ui/offline-indicator'
import { EmptyState } from '@/components/ui/empty-state'
import { MessageSquare } from 'lucide-react'

describe('Fallback UI Components', () => {
  describe('OfflineIndicator', () => {
    beforeEach(() => {
      // Mock navigator.onLine
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: true
      })
    })

    it('should not show indicator when online and showWhenOnline is false', () => {
      render(<OfflineIndicator showWhenOnline={false} />)
      expect(screen.queryByText('Đã kết nối')).not.toBeInTheDocument()
      expect(screen.queryByText('Không có kết nối mạng')).not.toBeInTheDocument()
    })

    it('should show offline indicator when offline', async () => {
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: false
      })

      render(<OfflineIndicator />)
      
      // Trigger offline event
      fireEvent(window, new Event('offline'))
      
      await waitFor(() => {
        expect(screen.getByText('Không có kết nối mạng')).toBeInTheDocument()
      })
    })

    it('should show online indicator when showWhenOnline is true', async () => {
      render(<OfflineIndicator showWhenOnline={true} />)
      
      await waitFor(() => {
        expect(screen.getByText('Đã kết nối')).toBeInTheDocument()
      })
    })

    it('should hide online indicator after 3 seconds', async () => {
      vi.useFakeTimers()
      
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: false
      })

      render(<OfflineIndicator showWhenOnline={true} />)
      
      // Go from offline to online
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: true
      })
      fireEvent(window, new Event('online'))
      
      await waitFor(() => {
        expect(screen.getByText('Đã kết nối')).toBeInTheDocument()
      })
      
      // Fast forward 3 seconds
      vi.advanceTimersByTime(3000)
      
      await waitFor(() => {
        expect(screen.queryByText('Đã kết nối')).not.toBeInTheDocument()
      })
      
      vi.useRealTimers()
    })

    it('should have proper accessibility attributes', async () => {
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: false
      })

      render(<OfflineIndicator />)
      
      fireEvent(window, new Event('offline'))
      
      await waitFor(() => {
        const indicator = screen.getByRole('status')
        expect(indicator).toHaveAttribute('aria-live', 'polite')
      })
    })
  })

  describe('RealtimeStatusIndicator', () => {
    it('should not show when connected via realtime', () => {
      render(
        <RealtimeStatusIndicator
          isConnected={true}
          isPolling={false}
        />
      )
      
      expect(screen.queryByText('Đang cập nhật thủ công')).not.toBeInTheDocument()
    })

    it('should show when using fallback polling', () => {
      render(
        <RealtimeStatusIndicator
          isConnected={false}
          isPolling={true}
        />
      )
      
      expect(screen.getByText('Đang cập nhật thủ công')).toBeInTheDocument()
    })

    it('should have spinning icon when polling', () => {
      render(
        <RealtimeStatusIndicator
          isConnected={false}
          isPolling={true}
        />
      )
      
      const icon = screen.getByText('Đang cập nhật thủ công').previousSibling
      expect(icon).toHaveClass('animate-spin')
    })

    it('should have proper accessibility attributes', () => {
      render(
        <RealtimeStatusIndicator
          isConnected={false}
          isPolling={true}
        />
      )
      
      const indicator = screen.getByRole('status')
      expect(indicator).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('EmptyState', () => {
    it('should render title', () => {
      render(<EmptyState title="No items" />)
      expect(screen.getByText('No items')).toBeInTheDocument()
    })

    it('should render description when provided', () => {
      render(
        <EmptyState
          title="No items"
          description="Add your first item to get started"
        />
      )
      expect(screen.getByText('Add your first item to get started')).toBeInTheDocument()
    })

    it('should render icon when provided', () => {
      render(
        <EmptyState
          icon={MessageSquare}
          title="No messages"
        />
      )
      
      // Icon should be rendered
      const icon = screen.getByLabelText('No messages').querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('should render action button when provided', () => {
      const handleClick = vi.fn()
      
      render(
        <EmptyState
          title="No items"
          action={{
            label: 'Add item',
            onClick: handleClick
          }}
        />
      )
      
      const button = screen.getByRole('button', { name: 'Add item' })
      expect(button).toBeInTheDocument()
      
      fireEvent.click(button)
      expect(handleClick).toHaveBeenCalledOnce()
    })

    it('should not render action button when not provided', () => {
      render(<EmptyState title="No items" />)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('should have proper accessibility attributes', () => {
      render(<EmptyState title="No items" />)
      
      const container = screen.getByRole('status')
      expect(container).toHaveAttribute('aria-label', 'No items')
    })

    it('should apply custom className', () => {
      render(
        <EmptyState
          title="No items"
          className="custom-class"
        />
      )
      
      const container = screen.getByRole('status')
      expect(container).toHaveClass('custom-class')
    })
  })
})
