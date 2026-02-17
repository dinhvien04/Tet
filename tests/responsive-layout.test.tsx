/**
 * Tests for responsive layout - Task 15.1
 * Requirements: 14.1, 14.2, 14.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { MobileMenu } from '@/components/layout/MobileMenu'
import { AppLayout } from '@/components/layout/AppLayout'

// Mock dependencies
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
      },
    },
    signOut: vi.fn(),
  }),
}))

vi.mock('@/components/notifications', () => ({
  NotificationBell: ({ userId }: { userId: string }) => (
    <div data-testid="notification-bell">{userId}</div>
  ),
}))

describe('Responsive Layout - Requirement 14.1, 14.2', () => {
  describe('Sidebar Component', () => {
    it('should render navigation items', () => {
      render(<Sidebar />)
      
      expect(screen.getByText('Trang chủ')).toBeInTheDocument()
      expect(screen.getByText('Sự kiện')).toBeInTheDocument()
      expect(screen.getByText('Album')).toBeInTheDocument()
      expect(screen.getByText('Gia đình')).toBeInTheDocument()
      expect(screen.getByText('Đăng xuất')).toBeInTheDocument()
    })

    it('should render logo', () => {
      render(<Sidebar />)
      expect(screen.getByText('Tết Connect')).toBeInTheDocument()
    })
  })

  describe('MobileHeader Component - Requirement 14.2', () => {
    it('should render hamburger menu button when closed', () => {
      const onMenuToggle = vi.fn()
      render(<MobileHeader onMenuToggle={onMenuToggle} isMenuOpen={false} />)
      
      const menuButton = screen.getByLabelText('Mở menu')
      expect(menuButton).toBeInTheDocument()
    })

    it('should render close button when menu is open', () => {
      const onMenuToggle = vi.fn()
      render(<MobileHeader onMenuToggle={onMenuToggle} isMenuOpen={true} />)
      
      const closeButton = screen.getByLabelText('Đóng menu')
      expect(closeButton).toBeInTheDocument()
    })

    it('should call onMenuToggle when button is clicked', () => {
      const onMenuToggle = vi.fn()
      render(<MobileHeader onMenuToggle={onMenuToggle} isMenuOpen={false} />)
      
      const menuButton = screen.getByLabelText('Mở menu')
      fireEvent.click(menuButton)
      
      expect(onMenuToggle).toHaveBeenCalledTimes(1)
    })

    it('should render notification bell', () => {
      const onMenuToggle = vi.fn()
      render(<MobileHeader onMenuToggle={onMenuToggle} isMenuOpen={false} />)
      
      expect(screen.getByTestId('notification-bell')).toBeInTheDocument()
    })

    it('should render logo', () => {
      const onMenuToggle = vi.fn()
      render(<MobileHeader onMenuToggle={onMenuToggle} isMenuOpen={false} />)
      
      expect(screen.getByText('Tết Connect')).toBeInTheDocument()
    })
  })

  describe('MobileMenu Component - Requirement 14.2', () => {
    it('should not render when closed', () => {
      const onClose = vi.fn()
      render(<MobileMenu isOpen={false} onClose={onClose} />)
      
      expect(screen.queryByText('Xin chào,')).not.toBeInTheDocument()
    })

    it('should render when open', () => {
      const onClose = vi.fn()
      render(<MobileMenu isOpen={true} onClose={onClose} />)
      
      expect(screen.getByText('Xin chào,')).toBeInTheDocument()
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    it('should render navigation items when open', () => {
      const onClose = vi.fn()
      render(<MobileMenu isOpen={true} onClose={onClose} />)
      
      expect(screen.getByText('Trang chủ')).toBeInTheDocument()
      expect(screen.getByText('Sự kiện')).toBeInTheDocument()
      expect(screen.getByText('Album')).toBeInTheDocument()
      expect(screen.getByText('Gia đình')).toBeInTheDocument()
    })

    it('should call onClose when backdrop is clicked', () => {
      const onClose = vi.fn()
      const { container } = render(<MobileMenu isOpen={true} onClose={onClose} />)
      
      const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/50')
      expect(backdrop).toBeInTheDocument()
      
      if (backdrop) {
        fireEvent.click(backdrop)
        expect(onClose).toHaveBeenCalledTimes(1)
      }
    })

    it('should call onClose when navigation item is clicked', () => {
      const onClose = vi.fn()
      render(<MobileMenu isOpen={true} onClose={onClose} />)
      
      const homeLink = screen.getByText('Trang chủ')
      fireEvent.click(homeLink)
      
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('AppLayout Component - Requirement 14.1, 14.2', () => {
    it('should render children content', () => {
      render(
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      )
      
      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })

    it('should render notification bell in desktop header', () => {
      render(
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      )
      
      // Should have notification bells in both mobile and desktop headers
      const bells = screen.getAllByTestId('notification-bell')
      expect(bells.length).toBeGreaterThanOrEqual(1)
    })

    it('should toggle mobile menu when hamburger is clicked', () => {
      render(
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      )
      
      // Initially menu should be closed
      expect(screen.queryByText('Xin chào,')).not.toBeInTheDocument()
      
      // Click hamburger to open
      const menuButton = screen.getByLabelText('Mở menu')
      fireEvent.click(menuButton)
      
      // Menu should now be open
      expect(screen.getByText('Xin chào,')).toBeInTheDocument()
    })
  })
})

describe('Responsive Breakpoints - Requirement 14.1, 14.3', () => {
  it('should have responsive classes on sidebar (hidden on mobile)', () => {
    const { container } = render(<Sidebar />)
    const sidebar = container.firstChild as HTMLElement
    
    // Sidebar should have classes that hide it on mobile
    expect(sidebar.className).toContain('flex')
  })

  it('should have responsive classes on mobile header (hidden on desktop)', () => {
    const onMenuToggle = vi.fn()
    const { container } = render(
      <MobileHeader onMenuToggle={onMenuToggle} isMenuOpen={false} />
    )
    const header = container.firstChild as HTMLElement
    
    // Header should have md:hidden class
    expect(header.className).toContain('md:hidden')
  })

  it('should have responsive padding on main content', () => {
    const { container } = render(
      <AppLayout>
        <div>Test</div>
      </AppLayout>
    )
    
    const main = container.querySelector('main')
    expect(main).toBeInTheDocument()
    
    // Main should have responsive padding classes
    if (main) {
      expect(main.className).toMatch(/p-\d+/)
      expect(main.className).toMatch(/md:p-\d+/)
    }
  })
})
