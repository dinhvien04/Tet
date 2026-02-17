/**
 * Unit tests for responsive design features - Task 15.3
 * Tests mobile menu, responsive layout, and camera access
 * Requirements: 14.1, 14.2, 14.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MobileMenu } from '@/components/layout/MobileMenu'
import { AppLayout } from '@/components/layout/AppLayout'
import { PhotoUploader } from '@/components/photos/PhotoUploader'

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

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Responsive Features - Task 15.3', () => {
  describe('Mobile Menu - Requirement 14.2', () => {
    it('should not render when closed', () => {
      const onClose = vi.fn()
      render(<MobileMenu isOpen={false} onClose={onClose} />)
      
      // Menu should not be visible
      expect(screen.queryByText('Xin chào,')).not.toBeInTheDocument()
      expect(screen.queryByText('Test User')).not.toBeInTheDocument()
    })

    it('should render when open', () => {
      const onClose = vi.fn()
      render(<MobileMenu isOpen={true} onClose={onClose} />)
      
      // User greeting should be visible
      expect(screen.getByText('Xin chào,')).toBeInTheDocument()
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    it('should render all navigation items', () => {
      const onClose = vi.fn()
      render(<MobileMenu isOpen={true} onClose={onClose} />)
      
      // All nav items should be present
      expect(screen.getByText('Trang chủ')).toBeInTheDocument()
      expect(screen.getByText('Sự kiện')).toBeInTheDocument()
      expect(screen.getByText('Album')).toBeInTheDocument()
      expect(screen.getByText('Gia đình')).toBeInTheDocument()
    })

    it('should render sign out button', () => {
      const onClose = vi.fn()
      render(<MobileMenu isOpen={true} onClose={onClose} />)
      
      expect(screen.getByText('Đăng xuất')).toBeInTheDocument()
    })

    it('should close when backdrop is clicked', () => {
      const onClose = vi.fn()
      const { container } = render(<MobileMenu isOpen={true} onClose={onClose} />)
      
      // Find backdrop
      const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/50')
      expect(backdrop).toBeInTheDocument()
      
      // Click backdrop
      if (backdrop) {
        fireEvent.click(backdrop)
        expect(onClose).toHaveBeenCalledTimes(1)
      }
    })

    it('should close when navigation item is clicked', () => {
      const onClose = vi.fn()
      render(<MobileMenu isOpen={true} onClose={onClose} />)
      
      // Click a navigation item
      const homeLink = screen.getByText('Trang chủ')
      fireEvent.click(homeLink)
      
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should have touch-friendly navigation items (min 48px height)', () => {
      const onClose = vi.fn()
      render(<MobileMenu isOpen={true} onClose={onClose} />)
      
      const homeLink = screen.getByText('Trang chủ').closest('a')
      expect(homeLink).toBeInTheDocument()
      
      // Check for touch-friendly classes
      if (homeLink) {
        expect(homeLink.className).toContain('min-h-[48px]')
        expect(homeLink.className).toContain('touch-manipulation')
      }
    })

    it('should have active state styling for current page', () => {
      const onClose = vi.fn()
      render(<MobileMenu isOpen={true} onClose={onClose} />)
      
      // Dashboard should be active (mocked pathname is /dashboard)
      const homeLink = screen.getByText('Trang chủ').closest('a')
      expect(homeLink).toBeInTheDocument()
      
      if (homeLink) {
        // Active link should have red background
        expect(homeLink.className).toContain('bg-red-50')
        expect(homeLink.className).toContain('text-red-600')
      }
    })

    it('should have proper z-index for overlay', () => {
      const onClose = vi.fn()
      const { container } = render(<MobileMenu isOpen={true} onClose={onClose} />)
      
      const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/50')
      const menu = container.querySelector('.fixed.inset-y-0.left-0')
      
      // Backdrop should be z-40, menu should be z-50
      expect(backdrop?.className).toContain('z-40')
      expect(menu?.className).toContain('z-50')
    })

    it('should only show on mobile (md:hidden)', () => {
      const onClose = vi.fn()
      const { container } = render(<MobileMenu isOpen={true} onClose={onClose} />)
      
      const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/50')
      const menu = container.querySelector('.fixed.inset-y-0.left-0')
      
      expect(backdrop?.className).toContain('md:hidden')
      expect(menu?.className).toContain('md:hidden')
    })
  })

  describe('Responsive Layout - Requirement 14.1, 14.2', () => {
    it('should render children content', () => {
      render(
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      )
      
      expect(screen.getByText('Test Content')).toBeInTheDocument()
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
      
      // Click close button
      const closeButton = screen.getByLabelText('Đóng menu')
      fireEvent.click(closeButton)
      
      // Menu should be closed again
      expect(screen.queryByText('Xin chào,')).not.toBeInTheDocument()
    })

    it('should have desktop sidebar hidden on mobile', () => {
      const { container } = render(
        <AppLayout>
          <div>Test</div>
        </AppLayout>
      )
      
      // Desktop sidebar should have hidden class for mobile
      const sidebar = container.querySelector('.hidden.md\\:fixed')
      expect(sidebar).toBeInTheDocument()
    })

    it('should have mobile header hidden on desktop', () => {
      render(
        <AppLayout>
          <div>Test</div>
        </AppLayout>
      )
      
      // Mobile header should be present but hidden on desktop
      const menuButton = screen.getByLabelText('Mở menu')
      const header = menuButton.closest('header')
      
      expect(header?.className).toContain('md:hidden')
    })

    it('should have desktop header hidden on mobile', () => {
      const { container } = render(
        <AppLayout>
          <div>Test</div>
        </AppLayout>
      )
      
      // Desktop header should have hidden class for mobile
      const desktopHeader = container.querySelector('header.hidden.md\\:block')
      expect(desktopHeader).toBeInTheDocument()
    })

    it('should have responsive padding on main content', () => {
      const { container } = render(
        <AppLayout>
          <div>Test</div>
        </AppLayout>
      )
      
      const main = container.querySelector('main')
      expect(main).toBeInTheDocument()
      
      // Main should have responsive padding
      if (main) {
        expect(main.className).toContain('p-4')
        expect(main.className).toContain('md:p-6')
        expect(main.className).toContain('lg:p-8')
      }
    })

    it('should render notification bell in both mobile and desktop headers', () => {
      render(
        <AppLayout>
          <div>Test</div>
        </AppLayout>
      )
      
      // Should have notification bells
      const bells = screen.getAllByTestId('notification-bell')
      expect(bells.length).toBeGreaterThanOrEqual(1)
    })

    it('should have proper layout structure with sidebar offset', () => {
      const { container } = render(
        <AppLayout>
          <div>Test</div>
        </AppLayout>
      )
      
      // Main content area should have left padding on desktop for sidebar
      const contentArea = container.querySelector('.md\\:pl-64')
      expect(contentArea).toBeInTheDocument()
    })
  })

  describe('Camera Access - Requirement 14.4', () => {
    const mockFamilyId = 'test-family-id'

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should render camera button on mobile', () => {
      render(<PhotoUploader familyId={mockFamilyId} />)
      
      const cameraButton = screen.getByText('Chụp ảnh')
      expect(cameraButton).toBeInTheDocument()
    })

    it('should have camera button hidden on desktop (md:hidden)', () => {
      render(<PhotoUploader familyId={mockFamilyId} />)
      
      const cameraButton = screen.getByText('Chụp ảnh')
      const button = cameraButton.closest('button')
      
      expect(button).toBeInTheDocument()
      if (button) {
        expect(button.className).toContain('md:hidden')
      }
    })

    it('should have camera input with capture attribute', () => {
      const { container } = render(<PhotoUploader familyId={mockFamilyId} />)
      
      // Find camera input (has capture attribute)
      const cameraInput = container.querySelector('input[capture="environment"]')
      expect(cameraInput).toBeInTheDocument()
      
      if (cameraInput) {
        expect(cameraInput.getAttribute('type')).toBe('file')
        expect(cameraInput.getAttribute('accept')).toBe('image/*')
      }
    })

    it('should have separate file input without capture attribute', () => {
      const { container } = render(<PhotoUploader familyId={mockFamilyId} />)
      
      // Find regular file input (no capture attribute)
      const fileInput = container.querySelector('input[type="file"]:not([capture])')
      expect(fileInput).toBeInTheDocument()
      
      if (fileInput) {
        expect(fileInput.getAttribute('accept')).toBe('image/jpeg,image/png,image/heic')
      }
    })

    it('should trigger camera input when camera button is clicked', () => {
      const { container } = render(<PhotoUploader familyId={mockFamilyId} />)
      
      const cameraInput = container.querySelector('input[capture="environment"]') as HTMLInputElement
      expect(cameraInput).toBeInTheDocument()
      
      // Mock click method
      const clickSpy = vi.spyOn(cameraInput, 'click')
      
      // Click camera button
      const cameraButton = screen.getByText('Chụp ảnh')
      fireEvent.click(cameraButton)
      
      expect(clickSpy).toHaveBeenCalled()
    })

    it('should have large button size for better touch target', () => {
      render(<PhotoUploader familyId={mockFamilyId} />)
      
      const cameraButton = screen.getByText('Chụp ảnh').closest('button')
      expect(cameraButton).toBeInTheDocument()
      
      // Should have large size class
      if (cameraButton) {
        expect(cameraButton.className).toMatch(/h-12|size-lg/)
      }
    })

    it('should handle file selection from camera', async () => {
      const onUploadSuccess = vi.fn()
      const { container } = render(
        <PhotoUploader 
          familyId={mockFamilyId} 
          onUploadSuccess={onUploadSuccess}
        />
      )
      
      const cameraInput = container.querySelector('input[capture="environment"]') as HTMLInputElement
      expect(cameraInput).toBeInTheDocument()
      
      // Simulate camera capture
      const file = new File(['camera-photo'], 'camera.jpg', { type: 'image/jpeg' })
      
      Object.defineProperty(cameraInput, 'files', {
        value: [file],
        writable: false,
      })
      
      fireEvent.change(cameraInput)
      
      // Should show preview
      await waitFor(() => {
        expect(screen.getByAltText('Preview')).toBeInTheDocument()
      })
    })

    it('should show both camera and file picker buttons', () => {
      render(<PhotoUploader familyId={mockFamilyId} />)
      
      expect(screen.getByText('Chọn ảnh')).toBeInTheDocument()
      expect(screen.getByText('Chụp ảnh')).toBeInTheDocument()
    })

    it('should have camera icon in button', () => {
      const { container } = render(<PhotoUploader familyId={mockFamilyId} />)
      
      const cameraButton = screen.getByText('Chụp ảnh').closest('button')
      expect(cameraButton).toBeInTheDocument()
      
      // Should contain Camera icon (lucide-react)
      if (cameraButton) {
        const svg = cameraButton.querySelector('svg')
        expect(svg).toBeInTheDocument()
      }
    })
  })

  describe('Responsive Image Sizing - Requirement 14.3', () => {
    it('should have responsive classes on photo preview', async () => {
      const { container } = render(<PhotoUploader familyId="test-family" />)
      
      // Select a file to show preview
      const fileInput = container.querySelector('input[type="file"]:not([capture])') as HTMLInputElement
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })
      
      fireEvent.change(fileInput)
      
      // Wait for preview to render
      await waitFor(() => {
        const preview = screen.getByAltText('Preview')
        expect(preview).toBeInTheDocument()
        
        // Should have responsive sizing classes
        expect(preview.className).toContain('w-full')
        expect(preview.className).toContain('object-contain')
      })
    })

    it('should have touch-friendly cancel button on preview', async () => {
      const { container } = render(<PhotoUploader familyId="test-family" />)
      
      const fileInput = container.querySelector('input[type="file"]:not([capture])') as HTMLInputElement
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })
      
      fireEvent.change(fileInput)
      
      await waitFor(() => {
        const cancelButton = screen.getByLabelText('Hủy')
        expect(cancelButton).toBeInTheDocument()
        
        // Should have touch-friendly size
        expect(cancelButton.className).toContain('min-h-[44px]')
        expect(cancelButton.className).toContain('min-w-[44px]')
        expect(cancelButton.className).toContain('touch-manipulation')
        expect(cancelButton.className).toContain('active:scale-95')
      })
    })
  })

  describe('Mobile-First Design Principles - Requirement 14.1', () => {
    it('should have mobile-first responsive classes', () => {
      const { container } = render(
        <AppLayout>
          <div>Test</div>
        </AppLayout>
      )
      
      const main = container.querySelector('main')
      
      // Mobile-first: base classes are for mobile, then md: and lg: for larger screens
      if (main) {
        const classes = main.className
        
        // Should have base mobile padding
        expect(classes).toContain('p-4')
        
        // Should have tablet/desktop overrides
        expect(classes).toContain('md:p-6')
        expect(classes).toContain('lg:p-8')
      }
    })

    it('should prioritize mobile menu over desktop sidebar on small screens', () => {
      const { container } = render(
        <AppLayout>
          <div>Test</div>
        </AppLayout>
      )
      
      // Desktop sidebar should be hidden on mobile
      const sidebar = container.querySelector('.hidden.md\\:fixed')
      expect(sidebar).toBeInTheDocument()
      
      // Mobile header should be visible on mobile
      const mobileHeader = screen.getByLabelText('Mở menu').closest('header')
      expect(mobileHeader?.className).toContain('md:hidden')
    })

    it('should have flexible button layout on mobile', () => {
      render(<PhotoUploader familyId="test-family" />)
      
      const buttons = screen.getAllByRole('button')
      const cameraButton = buttons.find(btn => btn.textContent?.includes('Chụp ảnh'))
      
      if (cameraButton) {
        // Should have flex-1 for flexible sizing
        expect(cameraButton.className).toContain('flex-1')
        expect(cameraButton.className).toContain('min-w-[140px]')
      }
    })
  })
})
