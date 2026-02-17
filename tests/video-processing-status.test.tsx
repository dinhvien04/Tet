import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VideoProcessingStatus } from '@/components/videos/VideoProcessingStatus'

describe('VideoProcessingStatus', () => {
  it('should not render when status is idle', () => {
    const { container } = render(<VideoProcessingStatus status="idle" />)
    expect(container.firstChild).toBeNull()
  })

  it('should show processing status with progress bar', () => {
    render(<VideoProcessingStatus status="processing" progress={50} />)
    
    expect(screen.getByText('Đang xử lý video...')).toBeInTheDocument()
    expect(screen.getByText('Vui lòng đợi trong giây lát')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('should show uploading status', () => {
    render(<VideoProcessingStatus status="uploading" />)
    
    expect(screen.getByText('Đang tải lên...')).toBeInTheDocument()
    expect(screen.getByText('Video đang được lưu trữ')).toBeInTheDocument()
  })

  it('should show completed status', () => {
    render(<VideoProcessingStatus status="completed" />)
    
    expect(screen.getByText('Hoàn thành!')).toBeInTheDocument()
    expect(screen.getByText('Video đã được tạo thành công')).toBeInTheDocument()
  })

  it('should show error status with custom error message', () => {
    const errorMessage = 'Custom error message'
    render(<VideoProcessingStatus status="error" error={errorMessage} />)
    
    expect(screen.getByText('Có lỗi xảy ra')).toBeInTheDocument()
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('should show default error message when no error provided', () => {
    render(<VideoProcessingStatus status="error" />)
    
    expect(screen.getByText('Không thể tạo video. Vui lòng thử lại.')).toBeInTheDocument()
  })

  it('should call onRetry when retry button is clicked', () => {
    const onRetry = vi.fn()
    render(<VideoProcessingStatus status="error" onRetry={onRetry} />)
    
    const retryButton = screen.getByText('Thử lại')
    fireEvent.click(retryButton)
    
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('should call onClose when close button is clicked on error', () => {
    const onClose = vi.fn()
    render(<VideoProcessingStatus status="error" onClose={onClose} />)
    
    const closeButton = screen.getByText('Đóng')
    fireEvent.click(closeButton)
    
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should call onClose when close button is clicked on completed', () => {
    const onClose = vi.fn()
    render(<VideoProcessingStatus status="completed" onClose={onClose} />)
    
    const closeButton = screen.getByText('Đóng')
    fireEvent.click(closeButton)
    
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should not show retry button when onRetry is not provided', () => {
    render(<VideoProcessingStatus status="error" />)
    
    expect(screen.queryByText('Thử lại')).not.toBeInTheDocument()
  })

  it('should not show close button when onClose is not provided', () => {
    render(<VideoProcessingStatus status="completed" />)
    
    expect(screen.queryByText('Đóng')).not.toBeInTheDocument()
  })

  it('should show progress bar only for processing status', () => {
    const { rerender } = render(<VideoProcessingStatus status="processing" progress={75} />)
    expect(screen.getByText('75%')).toBeInTheDocument()
    
    rerender(<VideoProcessingStatus status="uploading" progress={75} />)
    expect(screen.queryByText('75%')).not.toBeInTheDocument()
    
    rerender(<VideoProcessingStatus status="completed" progress={75} />)
    expect(screen.queryByText('75%')).not.toBeInTheDocument()
  })

  it('should update progress bar width', () => {
    const { container } = render(<VideoProcessingStatus status="processing" progress={60} />)
    
    const progressBar = container.querySelector('.bg-gradient-to-r')
    expect(progressBar).toHaveStyle({ width: '60%' })
  })
})
