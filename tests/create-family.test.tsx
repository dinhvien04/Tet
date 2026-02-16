import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CreateFamilyForm } from '@/components/family/CreateFamilyForm'

// Mock next/navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

// Mock fetch
global.fetch = vi.fn()

describe('CreateFamilyForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render form with input and button', () => {
    render(<CreateFamilyForm />)
    
    expect(screen.getByLabelText(/tên nhà/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/ví dụ/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tạo nhà/i })).toBeInTheDocument()
  })

  it('should show error when submitting empty name', async () => {
    render(<CreateFamilyForm />)
    
    const submitButton = screen.getByRole('button', { name: /tạo nhà/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/vui lòng nhập tên nhà/i)).toBeInTheDocument()
    })
  })

  it('should show error when submitting whitespace-only name', async () => {
    render(<CreateFamilyForm />)
    
    const input = screen.getByLabelText(/tên nhà/i)
    fireEvent.change(input, { target: { value: '   ' } })
    
    const submitButton = screen.getByRole('button', { name: /tạo nhà/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/vui lòng nhập tên nhà/i)).toBeInTheDocument()
    })
  })

  it('should show invite card on successful submission', async () => {
    const mockResponse = {
      id: 'test-id',
      name: 'Test Family',
      invite_code: 'ABC12345',
      created_at: new Date().toISOString(),
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    render(<CreateFamilyForm />)
    
    const input = screen.getByLabelText(/tên nhà/i)
    fireEvent.change(input, { target: { value: 'Test Family' } })
    
    const submitButton = screen.getByRole('button', { name: /tạo nhà/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/families', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test Family' }),
      })
    })

    // Should show success message and invite card
    await waitFor(() => {
      expect(screen.getByText(/tạo nhà thành công/i)).toBeInTheDocument()
      expect(screen.getByText(/test family/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/link mời thành viên/i)).toBeInTheDocument()
    })
  })

  it('should show error message on API failure', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Database error' }),
    })

    render(<CreateFamilyForm />)
    
    const input = screen.getByLabelText(/tên nhà/i)
    fireEvent.change(input, { target: { value: 'Test Family' } })
    
    const submitButton = screen.getByRole('button', { name: /tạo nhà/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/database error/i)).toBeInTheDocument()
    })
  })

  it('should disable input and button while loading', async () => {
    ;(global.fetch as any).mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    )

    render(<CreateFamilyForm />)
    
    const input = screen.getByLabelText(/tên nhà/i)
    fireEvent.change(input, { target: { value: 'Test Family' } })
    
    const submitButton = screen.getByRole('button', { name: /tạo nhà/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(input).toBeDisabled()
      expect(submitButton).toBeDisabled()
      expect(screen.getByText(/đang tạo/i)).toBeInTheDocument()
    })
  })

  it('should trim whitespace from family name', async () => {
    const mockResponse = {
      id: 'test-id',
      name: 'Test Family',
      invite_code: 'ABC12345',
      created_at: new Date().toISOString(),
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    render(<CreateFamilyForm />)
    
    const input = screen.getByLabelText(/tên nhà/i)
    fireEvent.change(input, { target: { value: '  Test Family  ' } })
    
    const submitButton = screen.getByRole('button', { name: /tạo nhà/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/families', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test Family' }),
      })
    })
  })

  it('should redirect to dashboard when clicking "Đi đến trang chủ" button', async () => {
    const mockResponse = {
      id: 'test-id',
      name: 'Test Family',
      invite_code: 'ABC12345',
      created_at: new Date().toISOString(),
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    render(<CreateFamilyForm />)
    
    const input = screen.getByLabelText(/tên nhà/i)
    fireEvent.change(input, { target: { value: 'Test Family' } })
    
    const submitButton = screen.getByRole('button', { name: /tạo nhà/i })
    fireEvent.click(submitButton)
    
    // Wait for invite card to appear
    await waitFor(() => {
      expect(screen.getByText(/tạo nhà thành công/i)).toBeInTheDocument()
    })

    // Click the "Đi đến trang chủ" button
    const dashboardButton = screen.getByRole('button', { name: /đi đến trang chủ/i })
    fireEvent.click(dashboardButton)

    expect(mockPush).toHaveBeenCalledWith('/dashboard')
    expect(mockRefresh).toHaveBeenCalled()
  })
})
