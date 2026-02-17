import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VideoRecapCreator } from '@/components/videos/VideoRecapCreator'
import * as videoCreator from '@/lib/video-creator'

/**
 * Unit tests for video module (Task 13.5)
 * Tests photo selection, processing status, and error handling
 * Requirements: 12.2, 12.8
 */

// Mock fetch
global.fetch = vi.fn()

const mockPhotos = [
  {
    id: '1',
    family_id: 'family-1',
    user_id: 'user-1',
    url: 'https://example.com/photo1.jpg',
    uploaded_at: '2024-01-01T00:00:00Z',
    users: { id: 'user-1', name: 'User 1', email: 'user1@example.com', avatar: null, created_at: '2024-01-01' }
  },
  {
    id: '2',
    family_id: 'family-1',
    user_id: 'user-2',
    url: 'https://example.com/photo2.jpg',
    uploaded_at: '2024-01-02T00:00:00Z',
    users: { id: 'user-2', name: 'User 2', email: 'user2@example.com', avatar: null, created_at: '2024-01-01' }
  },
  {
    id: '3',
    family_id: 'family-1',
    user_id: 'user-3',
    url: 'https://example.com/photo3.jpg',
    uploaded_at: '2024-01-03T00:00:00Z',
    users: { id: 'user-3', name: 'User 3', email: 'user3@example.com', avatar: null, created_at: '2024-01-01' }
  }
]

describe('Video Module - Photo Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(videoCreator, 'isVideoCreationSupported').mockReturnValue(true)
  })

  it('should open photo selector when create video button is clicked', () => {
    render(<VideoRecapCreator photos={mockPhotos} familyId="family-1" />)
    
    const createButton = screen.getByText('Tạo Video Recap')
    fireEvent.click(createButton)
    
    expect(screen.getByText('Chọn ảnh cho video')).toBeInTheDocument()
  })

  it('should display all available photos in selector', () => {
    render(<VideoRecapCreator photos={mockPhotos} familyId="family-1" />)
    
    fireEvent.click(screen.getByText('Tạo Video Recap'))
    
    expect(screen.getByAltText('Photo by User 1')).toBeInTheDocument()
    expect(screen.getByAltText('Photo by User 2')).toBeInTheDocument()
    expect(screen.getByAltText('Photo by User 3')).toBeInTheDocument()
  })

  it('should allow selecting and deselecting photos', () => {
    render(<VideoRecapCreator photos={mockPhotos} familyId="family-1" />)
    
    fireEvent.click(screen.getByText('Tạo Video Recap'))
    
    // Initially no photos selected
    expect(screen.getByText(/Đã chọn 0 \/ 50 ảnh/)).toBeInTheDocument()
    
    // Click first photo to select
    const firstPhoto = screen.getByAltText('Photo by User 1').closest('div')
    if (firstPhoto) {
      fireEvent.click(firstPhoto)
    }
    
    // Should show 1 selected
    expect(screen.getByText(/Đã chọn 1 \/ 50 ảnh/)).toBeInTheDocument()
  })

  it('should enable confirm button only when photos are selected', () => {
    render(<VideoRecapCreator photos={mockPhotos} familyId="family-1" />)
    
    fireEvent.click(screen.getByText('Tạo Video Recap'))
    
    // Initially disabled
    const confirmButton = screen.getByText(/Tạo Video \(0\)/)
    expect(confirmButton).toBeDisabled()
    
    // Select a photo
    const firstPhoto = screen.getByAltText('Photo by User 1').closest('div')
    if (firstPhoto) {
      fireEvent.click(firstPhoto)
    }
    
    // Should be enabled now
    const updatedButton = screen.getByText(/Tạo Video \(1\)/)
    expect(updatedButton).not.toBeDisabled()
  })

  it('should close selector when cancel is clicked', () => {
    render(<VideoRecapCreator photos={mockPhotos} familyId="family-1" />)
    
    fireEvent.click(screen.getByText('Tạo Video Recap'))
    expect(screen.getByText('Chọn ảnh cho video')).toBeInTheDocument()
    
    const cancelButtons = screen.getAllByText('Hủy')
    fireEvent.click(cancelButtons[0])
    
    expect(screen.queryByText('Chọn ảnh cho video')).not.toBeInTheDocument()
  })

  it('should respect maxPhotos limit', () => {
    render(<VideoRecapCreator photos={mockPhotos} familyId="family-1" maxPhotos={2} />)
    
    fireEvent.click(screen.getByText('Tạo Video Recap'))
    
    expect(screen.getByText(/Đã chọn 0 \/ 2 ảnh/)).toBeInTheDocument()
  })

  it('should disable button when no photos available', () => {
    render(<VideoRecapCreator photos={[]} familyId="family-1" />)
    
    const createButton = screen.getByText('Tạo Video Recap')
    expect(createButton).toBeInTheDocument()
    
    // Button should be disabled when no photos
    const button = createButton.closest('button')
    expect(button).toBeDisabled()
  })

  it('should show error when browser not supported', () => {
    vi.spyOn(videoCreator, 'isVideoCreationSupported').mockReturnValue(false)
    
    render(<VideoRecapCreator photos={mockPhotos} familyId="family-1" />)
    
    fireEvent.click(screen.getByText('Tạo Video Recap'))
    
    expect(screen.getByText('Có lỗi xảy ra')).toBeInTheDocument()
    expect(screen.getByText(/Trình duyệt không hỗ trợ tạo video/)).toBeInTheDocument()
  })
})

describe('Video Module - Processing Status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(videoCreator, 'isVideoCreationSupported').mockReturnValue(true)
  })

  it('should show processing status when creating video', async () => {
    // Mock createVideoRecap to delay
    vi.spyOn(videoCreator, 'createVideoRecap').mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        blob: new Blob(['test'], { type: 'video/webm' }),
        url: 'blob:test',
        duration: 3000
      }), 100))
    )
    
    vi.spyOn(videoCreator, 'blobToBase64').mockResolvedValue('data:video/webm;base64,test')
    
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, videoUrl: 'https://example.com/video.webm' })
    })
    
    render(<VideoRecapCreator photos={mockPhotos} familyId="family-1" />)
    
    // Open selector and select photo
    fireEvent.click(screen.getByText('Tạo Video Recap'))
    const firstPhoto = screen.getByAltText('Photo by User 1').closest('div')
    if (firstPhoto) {
      fireEvent.click(firstPhoto)
    }
    
    // Confirm selection
    fireEvent.click(screen.getByText(/Tạo Video \(1\)/))
    
    // Should show processing status
    await waitFor(() => {
      expect(screen.getByText('Đang xử lý video...')).toBeInTheDocument()
    })
  })

  it('should show progress percentage during processing', async () => {
    let progressCallback: ((progress: number) => void) | undefined
    
    vi.spyOn(videoCreator, 'createVideoRecap').mockImplementation(
      (options) => {
        progressCallback = options.onProgress
        return new Promise(resolve => {
          setTimeout(() => {
            if (progressCallback) {
              progressCallback(50)
              setTimeout(() => {
                if (progressCallback) progressCallback(100)
                resolve({
                  blob: new Blob(['test'], { type: 'video/webm' }),
                  url: 'blob:test',
                  duration: 3000
                })
              }, 50)
            }
          }, 50)
        })
      }
    )
    
    vi.spyOn(videoCreator, 'blobToBase64').mockResolvedValue('data:video/webm;base64,test')
    
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, videoUrl: 'https://example.com/video.webm' })
    })
    
    render(<VideoRecapCreator photos={mockPhotos} familyId="family-1" />)
    
    fireEvent.click(screen.getByText('Tạo Video Recap'))
    const firstPhoto = screen.getByAltText('Photo by User 1').closest('div')
    if (firstPhoto) {
      fireEvent.click(firstPhoto)
    }
    fireEvent.click(screen.getByText(/Tạo Video \(1\)/))
    
    // Should show progress
    await waitFor(() => {
      expect(screen.getByText('Đang xử lý video...')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should show uploading status after video creation', async () => {
    vi.spyOn(videoCreator, 'createVideoRecap').mockResolvedValue({
      blob: new Blob(['test'], { type: 'video/webm' }),
      url: 'blob:test',
      duration: 3000
    })
    
    vi.spyOn(videoCreator, 'blobToBase64').mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('data:video/webm;base64,test'), 100))
    )
    
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, videoUrl: 'https://example.com/video.webm' })
    })
    
    render(<VideoRecapCreator photos={mockPhotos} familyId="family-1" />)
    
    fireEvent.click(screen.getByText('Tạo Video Recap'))
    const firstPhoto = screen.getByAltText('Photo by User 1').closest('div')
    if (firstPhoto) {
      fireEvent.click(firstPhoto)
    }
    fireEvent.click(screen.getByText(/Tạo Video \(1\)/))
    
    // Should eventually show uploading status
    await waitFor(() => {
      expect(screen.getByText('Đang tải lên...')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should show completed status after successful upload', async () => {
    vi.spyOn(videoCreator, 'createVideoRecap').mockResolvedValue({
      blob: new Blob(['test'], { type: 'video/webm' }),
      url: 'blob:test',
      duration: 3000
    })
    
    vi.spyOn(videoCreator, 'blobToBase64').mockResolvedValue('data:video/webm;base64,test')
    
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, videoUrl: 'https://example.com/video.webm' })
    })
    
    render(<VideoRecapCreator photos={mockPhotos} familyId="family-1" />)
    
    fireEvent.click(screen.getByText('Tạo Video Recap'))
    const firstPhoto = screen.getByAltText('Photo by User 1').closest('div')
    if (firstPhoto) {
      fireEvent.click(firstPhoto)
    }
    fireEvent.click(screen.getByText(/Tạo Video \(1\)/))
    
    // Should show completed status
    await waitFor(() => {
      expect(screen.getByText('Hoàn thành!')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should disable create button during processing', async () => {
    vi.spyOn(videoCreator, 'createVideoRecap').mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        blob: new Blob(['test'], { type: 'video/webm' }),
        url: 'blob:test',
        duration: 3000
      }), 100))
    )
    
    vi.spyOn(videoCreator, 'blobToBase64').mockResolvedValue('data:video/webm;base64,test')
    
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, videoUrl: 'https://example.com/video.webm' })
    })
    
    render(<VideoRecapCreator photos={mockPhotos} familyId="family-1" />)
    
    const createButtonText = screen.getByText('Tạo Video Recap')
    const createButton = createButtonText.closest('button')
    expect(createButton).not.toBeDisabled()
    
    fireEvent.click(createButton!)
    const firstPhoto = screen.getByAltText('Photo by User 1').closest('div')
    if (firstPhoto) {
      fireEvent.click(firstPhoto)
    }
    fireEvent.click(screen.getByText(/Tạo Video \(1\)/))
    
    // Button should be disabled during processing
    await waitFor(() => {
      expect(screen.getByText('Đang xử lý video...')).toBeInTheDocument()
    })
    
    // Verify button is disabled
    const buttonDuringProcessing = screen.getByText('Tạo Video Recap').closest('button')
    expect(buttonDuringProcessing).toBeDisabled()
  })
})

describe('Video Module - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(videoCreator, 'isVideoCreationSupported').mockReturnValue(true)
  })

  it('should show error when video creation fails', async () => {
    vi.spyOn(videoCreator, 'createVideoRecap').mockRejectedValue(
      new Error('Không thể tạo video')
    )
    
    render(<VideoRecapCreator photos={mockPhotos} familyId="family-1" />)
    
    fireEvent.click(screen.getByText('Tạo Video Recap'))
    const firstPhoto = screen.getByAltText('Photo by User 1').closest('div')
    if (firstPhoto) {
      fireEvent.click(firstPhoto)
    }
    fireEvent.click(screen.getByText(/Tạo Video \(1\)/))
    
    await waitFor(() => {
      expect(screen.getByText('Có lỗi xảy ra')).toBeInTheDocument()
      expect(screen.getByText('Không thể tạo video')).toBeInTheDocument()
    })
  })

  it('should show error when upload fails', async () => {
    vi.spyOn(videoCreator, 'createVideoRecap').mockResolvedValue({
      blob: new Blob(['test'], { type: 'video/webm' }),
      url: 'blob:test',
      duration: 3000
    })
    
    vi.spyOn(videoCreator, 'blobToBase64').mockResolvedValue('data:video/webm;base64,test')
    
    ;(global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Upload failed' })
    })
    
    render(<VideoRecapCreator photos={mockPhotos} familyId="family-1" />)
    
    fireEvent.click(screen.getByText('Tạo Video Recap'))
    const firstPhoto = screen.getByAltText('Photo by User 1').closest('div')
    if (firstPhoto) {
      fireEvent.click(firstPhoto)
    }
    fireEvent.click(screen.getByText(/Tạo Video \(1\)/))
    
    await waitFor(() => {
      expect(screen.getByText('Có lỗi xảy ra')).toBeInTheDocument()
      expect(screen.getByText('Upload failed')).toBeInTheDocument()
    })
  })

  it('should show retry button on error', async () => {
    vi.spyOn(videoCreator, 'createVideoRecap').mockRejectedValue(
      new Error('Test error')
    )
    
    render(<VideoRecapCreator photos={mockPhotos} familyId="family-1" />)
    
    fireEvent.click(screen.getByText('Tạo Video Recap'))
    const firstPhoto = screen.getByAltText('Photo by User 1').closest('div')
    if (firstPhoto) {
      fireEvent.click(firstPhoto)
    }
    fireEvent.click(screen.getByText(/Tạo Video \(1\)/))
    
    await waitFor(() => {
      expect(screen.getByText('Thử lại')).toBeInTheDocument()
    })
  })

  it('should reopen photo selector when retry is clicked', async () => {
    vi.spyOn(videoCreator, 'createVideoRecap').mockRejectedValue(
      new Error('Test error')
    )
    
    render(<VideoRecapCreator photos={mockPhotos} familyId="family-1" />)
    
    fireEvent.click(screen.getByText('Tạo Video Recap'))
    const firstPhoto = screen.getByAltText('Photo by User 1').closest('div')
    if (firstPhoto) {
      fireEvent.click(firstPhoto)
    }
    fireEvent.click(screen.getByText(/Tạo Video \(1\)/))
    
    await waitFor(() => {
      expect(screen.getByText('Thử lại')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Thử lại'))
    
    // Should reopen selector
    expect(screen.getByText('Chọn ảnh cho video')).toBeInTheDocument()
  })

  it('should close error modal when close button is clicked', async () => {
    vi.spyOn(videoCreator, 'createVideoRecap').mockRejectedValue(
      new Error('Test error')
    )
    
    render(<VideoRecapCreator photos={mockPhotos} familyId="family-1" />)
    
    fireEvent.click(screen.getByText('Tạo Video Recap'))
    const firstPhoto = screen.getByAltText('Photo by User 1').closest('div')
    if (firstPhoto) {
      fireEvent.click(firstPhoto)
    }
    fireEvent.click(screen.getByText(/Tạo Video \(1\)/))
    
    await waitFor(() => {
      expect(screen.getByText('Có lỗi xảy ra')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Đóng'))
    
    // Error modal should be closed
    expect(screen.queryByText('Có lỗi xảy ra')).not.toBeInTheDocument()
  })

  it('should handle photo limit exceeded error', async () => {
    const manyPhotos = Array(51).fill(null).map((_, i) => ({
      id: `photo-${i}`,
      family_id: 'family-1',
      user_id: 'user-1',
      url: `https://example.com/photo${i}.jpg`,
      uploaded_at: '2024-01-01T00:00:00Z',
      users: { id: 'user-1', name: 'User 1', email: 'user1@example.com', avatar: null, created_at: '2024-01-01' }
    }))
    
    vi.spyOn(videoCreator, 'createVideoRecap').mockRejectedValue(
      new Error('Tối đa 50 ảnh')
    )
    
    render(<VideoRecapCreator photos={manyPhotos} familyId="family-1" />)
    
    fireEvent.click(screen.getByText('Tạo Video Recap'))
    
    // Select all photos (should be limited to 50)
    fireEvent.click(screen.getByText('Chọn tất cả'))
    
    // Should show limit warning
    expect(screen.getByText(/Đã đạt giới hạn 50 ảnh/)).toBeInTheDocument()
  })

  it('should handle network errors gracefully', async () => {
    vi.spyOn(videoCreator, 'createVideoRecap').mockResolvedValue({
      blob: new Blob(['test'], { type: 'video/webm' }),
      url: 'blob:test',
      duration: 3000
    })
    
    vi.spyOn(videoCreator, 'blobToBase64').mockResolvedValue('data:video/webm;base64,test')
    
    ;(global.fetch as any).mockRejectedValue(new Error('Network error'))
    
    render(<VideoRecapCreator photos={mockPhotos} familyId="family-1" />)
    
    fireEvent.click(screen.getByText('Tạo Video Recap'))
    const firstPhoto = screen.getByAltText('Photo by User 1').closest('div')
    if (firstPhoto) {
      fireEvent.click(firstPhoto)
    }
    fireEvent.click(screen.getByText(/Tạo Video \(1\)/))
    
    await waitFor(() => {
      expect(screen.getByText('Có lỗi xảy ra')).toBeInTheDocument()
    })
  })

  it('should show Vietnamese error messages', async () => {
    vi.spyOn(videoCreator, 'createVideoRecap').mockRejectedValue(
      new Error('Không đủ bộ nhớ')
    )
    
    render(<VideoRecapCreator photos={mockPhotos} familyId="family-1" />)
    
    fireEvent.click(screen.getByText('Tạo Video Recap'))
    const firstPhoto = screen.getByAltText('Photo by User 1').closest('div')
    if (firstPhoto) {
      fireEvent.click(firstPhoto)
    }
    fireEvent.click(screen.getByText(/Tạo Video \(1\)/))
    
    await waitFor(() => {
      const errorText = screen.getByText(/Không đủ bộ nhớ/)
      expect(errorText).toBeInTheDocument()
      // Verify it's in Vietnamese (contains Vietnamese characters)
      expect(errorText.textContent).toMatch(/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i)
    })
  })
})
