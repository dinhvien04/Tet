import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CreateEventForm } from '@/components/events/CreateEventForm'
import { toast } from 'sonner'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

global.fetch = vi.fn()

describe('CreateEventForm', () => {
  const mockFamilyId = 'test-family-id'
  const mockOnEventCreated = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render form fields', () => {
    render(<CreateEventForm familyId={mockFamilyId} />)

    expect(screen.getByLabelText(/tiêu đề sự kiện/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/ngày/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/địa điểm/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tạo sự kiện/i })).toBeInTheDocument()
  })

  it('should show error when submitting with empty title', async () => {
    render(<CreateEventForm familyId={mockFamilyId} />)

    const titleInput = screen.getByLabelText(/tiêu đề sự kiện/i)
    const dateInput = screen.getByLabelText(/ngày/i)
    const submitButton = screen.getByRole('button', { name: /tạo sự kiện/i })

    // Set date but leave title empty (just whitespace)
    fireEvent.change(titleInput, { target: { value: '   ' } })
    fireEvent.change(dateInput, { target: { value: '2025-01-28T18:00' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Vui lòng nhập tiêu đề và ngày')
    })
  })

  it('should submit form with valid data', async () => {
    const mockResponse = {
      id: 'event-id',
      title: 'Cúng tất niên',
      date: '2025-01-28T18:00:00.000Z',
      location: 'Nhà ông bà'
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    render(
      <CreateEventForm 
        familyId={mockFamilyId} 
        onEventCreated={mockOnEventCreated}
      />
    )

    const titleInput = screen.getByLabelText(/tiêu đề sự kiện/i)
    const dateInput = screen.getByLabelText(/ngày/i)
    const locationInput = screen.getByLabelText(/địa điểm/i)
    const submitButton = screen.getByRole('button', { name: /tạo sự kiện/i })

    fireEvent.change(titleInput, { target: { value: 'Cúng tất niên' } })
    fireEvent.change(dateInput, { target: { value: '2025-01-28T18:00' } })
    fireEvent.change(locationInput, { target: { value: 'Nhà ông bà' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('Cúng tất niên')
      })
      expect(toast.success).toHaveBeenCalledWith('Đã tạo sự kiện thành công!')
      expect(mockOnEventCreated).toHaveBeenCalled()
    })
  })

  it('should handle API errors', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to create event' })
    })

    render(<CreateEventForm familyId={mockFamilyId} />)

    const titleInput = screen.getByLabelText(/tiêu đề sự kiện/i)
    const dateInput = screen.getByLabelText(/ngày/i)
    const submitButton = screen.getByRole('button', { name: /tạo sự kiện/i })

    fireEvent.change(titleInput, { target: { value: 'Test Event' } })
    fireEvent.change(dateInput, { target: { value: '2025-01-28T18:00' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
  })

  it('should disable form during submission', async () => {
    ;(global.fetch as any).mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 100))
    )

    render(<CreateEventForm familyId={mockFamilyId} />)

    const titleInput = screen.getByLabelText(/tiêu đề sự kiện/i)
    const dateInput = screen.getByLabelText(/ngày/i)
    const submitButton = screen.getByRole('button', { name: /tạo sự kiện/i })

    fireEvent.change(titleInput, { target: { value: 'Test Event' } })
    fireEvent.change(dateInput, { target: { value: '2025-01-28T18:00' } })
    fireEvent.click(submitButton)

    expect(submitButton).toBeDisabled()
    expect(screen.getByText(/đang tạo/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
  })
})
