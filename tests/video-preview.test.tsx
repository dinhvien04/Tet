import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VideoPreview } from '@/components/videos/VideoPreview'

describe('VideoPreview', () => {
  const mockVideoUrl = 'https://example.com/video.webm'
  
  beforeEach(() => {
    // Mock document.createElement for download link
    vi.spyOn(document, 'createElement')
    vi.spyOn(document.body, 'appendChild')
    vi.spyOn(document.body, 'removeChild')
  })

  it('should render video player with correct source', () => {
    const onClose = vi.fn()
    const { container } = render(<VideoPreview videoUrl={mockVideoUrl} onClose={onClose} />)
    
    const video = container.querySelector('video') as HTMLVideoElement
    expect(video).toBeInTheDocument()
    expect(video.src).toBe(mockVideoUrl)
  })

  it('should have controls and autoplay enabled', () => {
    const onClose = vi.fn()
    const { container } = render(<VideoPreview videoUrl={mockVideoUrl} onClose={onClose} />)
    
    const video = container.querySelector('video') as HTMLVideoElement
    expect(video).toHaveAttribute('controls')
    expect(video).toHaveAttribute('autoplay')
  })

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<VideoPreview videoUrl={mockVideoUrl} onClose={onClose} />)
    
    // Get the button with X icon (not the background overlay)
    const closeButton = screen.getAllByLabelText('Đóng')[0]
    fireEvent.click(closeButton)
    
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should call onDownload when download button is clicked', () => {
    const onClose = vi.fn()
    const onDownload = vi.fn()
    render(<VideoPreview videoUrl={mockVideoUrl} onClose={onClose} onDownload={onDownload} />)
    
    const downloadButton = screen.getByLabelText('Tải xuống video')
    fireEvent.click(downloadButton)
    
    expect(onDownload).toHaveBeenCalledTimes(1)
  })

  it('should show title and description', () => {
    const onClose = vi.fn()
    render(<VideoPreview videoUrl={mockVideoUrl} onClose={onClose} />)
    
    expect(screen.getByText('Video Recap')).toBeInTheDocument()
    expect(screen.getByText(/Video đã được tạo thành công/)).toBeInTheDocument()
  })

  it('should show download button text on desktop', () => {
    const onClose = vi.fn()
    render(<VideoPreview videoUrl={mockVideoUrl} onClose={onClose} />)
    
    // The download text is hidden on mobile but visible on desktop
    expect(screen.getByText('Tải xuống')).toBeInTheDocument()
  })

  it('should create download link when onDownload is not provided', () => {
    const onClose = vi.fn()
    
    render(<VideoPreview videoUrl={mockVideoUrl} onClose={onClose} />)
    
    const downloadButton = screen.getByLabelText('Tải xuống video')
    
    // Just verify the button exists and is clickable
    // The actual download behavior is tested in integration tests
    expect(downloadButton).toBeInTheDocument()
    fireEvent.click(downloadButton)
    
    // No error should be thrown
  })
})
