import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FamilyInviteCard } from '@/components/family/FamilyInviteCard'
import { toast } from 'sonner'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock clipboard API
const mockWriteText = vi.fn()

describe('FamilyInviteCard', () => {
  const mockInviteCode = 'ABC12345'
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock window.location.origin
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:3000',
      },
      writable: true,
    })
    
    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render invite link input and copy button', () => {
    render(<FamilyInviteCard inviteCode={mockInviteCode} />)
    
    expect(screen.getByLabelText(/link mời thành viên/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sao chép/i })).toBeInTheDocument()
  })

  it('should display correct invite link', () => {
    render(<FamilyInviteCard inviteCode={mockInviteCode} />)
    
    const input = screen.getByDisplayValue(`http://localhost:3000/join/${mockInviteCode}`)
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('readonly')
  })

  it('should copy invite link to clipboard when button is clicked', async () => {
    mockWriteText.mockResolvedValueOnce(undefined)
    
    render(<FamilyInviteCard inviteCode={mockInviteCode} />)
    
    const copyButton = screen.getByRole('button', { name: /sao chép/i })
    fireEvent.click(copyButton)
    
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(`http://localhost:3000/join/${mockInviteCode}`)
      expect(toast.success).toHaveBeenCalledWith('Đã sao chép link mời!')
    })
  })

  it('should show error toast when clipboard copy fails', async () => {
    mockWriteText.mockRejectedValueOnce(new Error('Clipboard error'))
    
    render(<FamilyInviteCard inviteCode={mockInviteCode} />)
    
    const copyButton = screen.getByRole('button', { name: /sao chép/i })
    fireEvent.click(copyButton)
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Không thể sao chép link. Vui lòng thử lại.')
    })
  })

  it('should disable button and show loading text while copying', async () => {
    // Create a promise that we can control
    let resolveClipboard: () => void
    const clipboardPromise = new Promise<void>((resolve) => {
      resolveClipboard = resolve
    })
    mockWriteText.mockReturnValueOnce(clipboardPromise)
    
    render(<FamilyInviteCard inviteCode={mockInviteCode} />)
    
    const copyButton = screen.getByRole('button', { name: /sao chép/i })
    fireEvent.click(copyButton)
    
    // Button should be disabled and show loading text
    await waitFor(() => {
      expect(copyButton).toBeDisabled()
      expect(screen.getByText(/đang sao chép/i)).toBeInTheDocument()
    })
    
    // Resolve the clipboard promise
    resolveClipboard!()
    
    // Button should be enabled again
    await waitFor(() => {
      expect(copyButton).not.toBeDisabled()
      expect(screen.getByText(/^sao chép$/i)).toBeInTheDocument()
    })
  })

  it('should display helper text', () => {
    render(<FamilyInviteCard inviteCode={mockInviteCode} />)
    
    expect(screen.getByText(/chia sẻ link này với các thành viên gia đình/i)).toBeInTheDocument()
  })

  it('should handle different invite codes', () => {
    const { rerender } = render(<FamilyInviteCard inviteCode="CODE123" />)
    expect(screen.getByDisplayValue('http://localhost:3000/join/CODE123')).toBeInTheDocument()
    
    rerender(<FamilyInviteCard inviteCode="XYZ789" />)
    expect(screen.getByDisplayValue('http://localhost:3000/join/XYZ789')).toBeInTheDocument()
  })
})
