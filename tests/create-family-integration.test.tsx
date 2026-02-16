import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CreateFamilyPage from '@/app/family/create/page'

// Mock next/navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

// Mock AuthProvider
vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    loading: false,
  }),
}))

// Mock ProtectedRoute
vi.mock('@/components/auth/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock fetch
global.fetch = vi.fn()

describe('Create Family Integration Test', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should complete full flow: render page, fill form, submit, show invite card, and redirect', async () => {
    const mockResponse = {
      id: 'family-123',
      name: 'Gia đình Nguyễn',
      invite_code: 'ABC12345',
      created_at: new Date().toISOString(),
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    render(<CreateFamilyPage />)

    // Verify page renders
    expect(screen.getByText(/tạo nhà mới/i)).toBeInTheDocument()
    expect(screen.getByText(/tạo không gian riêng/i)).toBeInTheDocument()

    // Fill in the form
    const input = screen.getByLabelText(/tên nhà/i)
    fireEvent.change(input, { target: { value: 'Gia đình Nguyễn' } })

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /tạo nhà/i })
    fireEvent.click(submitButton)

    // Verify API was called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/families', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Gia đình Nguyễn' }),
      })
    })

    // Verify success message and invite card appear
    await waitFor(() => {
      expect(screen.getByText(/tạo nhà thành công/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/link mời thành viên/i)).toBeInTheDocument()
    })

    // Click the "Đi đến trang chủ" button
    const dashboardButton = screen.getByRole('button', { name: /đi đến trang chủ/i })
    fireEvent.click(dashboardButton)

    // Verify redirect happened
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('should show validation error for empty name', async () => {
    render(<CreateFamilyPage />)

    // Try to submit without filling the form
    const submitButton = screen.getByRole('button', { name: /tạo nhà/i })
    fireEvent.click(submitButton)

    // Verify error message appears
    await waitFor(() => {
      expect(screen.getByText(/vui lòng nhập tên nhà/i)).toBeInTheDocument()
    })

    // Verify API was not called
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should handle API errors gracefully', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Không thể tạo nhà' }),
    })

    render(<CreateFamilyPage />)

    // Fill and submit form
    const input = screen.getByLabelText(/tên nhà/i)
    fireEvent.change(input, { target: { value: 'Test Family' } })

    const submitButton = screen.getByRole('button', { name: /tạo nhà/i })
    fireEvent.click(submitButton)

    // Verify error message appears
    await waitFor(() => {
      expect(screen.getByText(/không thể tạo nhà/i)).toBeInTheDocument()
    })

    // Verify no redirect happened
    expect(mockPush).not.toHaveBeenCalled()
  })
})
