import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VideoRecapButton } from '@/components/videos/VideoRecapButton'

describe('VideoRecapButton', () => {
  it('should render button with correct text', () => {
    const onClick = vi.fn()
    render(<VideoRecapButton onClick={onClick} />)
    
    expect(screen.getByText('Tạo Video Recap')).toBeInTheDocument()
    expect(screen.getByLabelText('Tạo video recap')).toBeInTheDocument()
  })

  it('should call onClick when clicked', () => {
    const onClick = vi.fn()
    render(<VideoRecapButton onClick={onClick} />)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('should be disabled when disabled prop is true', () => {
    const onClick = vi.fn()
    render(<VideoRecapButton onClick={onClick} disabled={true} />)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('should not be disabled when disabled prop is false', () => {
    const onClick = vi.fn()
    render(<VideoRecapButton onClick={onClick} disabled={false} />)
    
    const button = screen.getByRole('button')
    expect(button).not.toBeDisabled()
  })

  it('should have correct styling classes', () => {
    const onClick = vi.fn()
    render(<VideoRecapButton onClick={onClick} />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-gradient-to-r', 'from-red-600', 'to-pink-600')
  })
})
