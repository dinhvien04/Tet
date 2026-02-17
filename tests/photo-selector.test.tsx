import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PhotoSelector } from '@/components/videos/PhotoSelector'

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
  }
]

describe('PhotoSelector', () => {
  it('should render with title and photo count', () => {
    const onSelectionChange = vi.fn()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    
    render(
      <PhotoSelector
        photos={mockPhotos}
        selectedPhotoIds={[]}
        onSelectionChange={onSelectionChange}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    expect(screen.getByText('Chọn ảnh cho video')).toBeInTheDocument()
    expect(screen.getByText(/Đã chọn 0 \/ 50 ảnh/)).toBeInTheDocument()
  })

  it('should display photos in grid', () => {
    const onSelectionChange = vi.fn()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    
    render(
      <PhotoSelector
        photos={mockPhotos}
        selectedPhotoIds={[]}
        onSelectionChange={onSelectionChange}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    expect(screen.getByAltText('Photo by User 1')).toBeInTheDocument()
    expect(screen.getByAltText('Photo by User 2')).toBeInTheDocument()
  })

  it('should call onCancel when cancel button is clicked', () => {
    const onSelectionChange = vi.fn()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    
    render(
      <PhotoSelector
        photos={mockPhotos}
        selectedPhotoIds={[]}
        onSelectionChange={onSelectionChange}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    const cancelButtons = screen.getAllByText('Hủy')
    fireEvent.click(cancelButtons[0])
    
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('should call onConfirm when confirm button is clicked', () => {
    const onSelectionChange = vi.fn()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    
    render(
      <PhotoSelector
        photos={mockPhotos}
        selectedPhotoIds={['1']}
        onSelectionChange={onSelectionChange}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    const confirmButton = screen.getByText(/Tạo Video \(1\)/)
    fireEvent.click(confirmButton)
    
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('should disable confirm button when no photos selected', () => {
    const onSelectionChange = vi.fn()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    
    render(
      <PhotoSelector
        photos={mockPhotos}
        selectedPhotoIds={[]}
        onSelectionChange={onSelectionChange}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    const confirmButton = screen.getByText(/Tạo Video \(0\)/)
    expect(confirmButton).toBeDisabled()
  })

  it('should show selected count in button text', () => {
    const onSelectionChange = vi.fn()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    
    render(
      <PhotoSelector
        photos={mockPhotos}
        selectedPhotoIds={['1', '2']}
        onSelectionChange={onSelectionChange}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    expect(screen.getByText(/Tạo Video \(2\)/)).toBeInTheDocument()
    expect(screen.getByText(/Đã chọn 2 \/ 50 ảnh/)).toBeInTheDocument()
  })

  it('should show empty state when no photos', () => {
    const onSelectionChange = vi.fn()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    
    render(
      <PhotoSelector
        photos={[]}
        selectedPhotoIds={[]}
        onSelectionChange={onSelectionChange}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    expect(screen.getByText('Chưa có ảnh nào')).toBeInTheDocument()
  })

  it('should respect maxPhotos limit', () => {
    const onSelectionChange = vi.fn()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    
    render(
      <PhotoSelector
        photos={mockPhotos}
        selectedPhotoIds={['1', '2']}
        onSelectionChange={onSelectionChange}
        onConfirm={onConfirm}
        onCancel={onCancel}
        maxPhotos={2}
      />
    )
    
    expect(screen.getByText(/Đã chọn 2 \/ 2 ảnh/)).toBeInTheDocument()
    expect(screen.getByText(/Đã đạt giới hạn 2 ảnh/)).toBeInTheDocument()
  })

  it('should call onSelectionChange with all photo IDs when select all is clicked', () => {
    const onSelectionChange = vi.fn()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    
    render(
      <PhotoSelector
        photos={mockPhotos}
        selectedPhotoIds={[]}
        onSelectionChange={onSelectionChange}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    const selectAllButton = screen.getByText('Chọn tất cả')
    fireEvent.click(selectAllButton)
    
    expect(onSelectionChange).toHaveBeenCalledWith(['1', '2'])
  })

  it('should call onSelectionChange with empty array when deselect all is clicked', () => {
    const onSelectionChange = vi.fn()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    
    render(
      <PhotoSelector
        photos={mockPhotos}
        selectedPhotoIds={['1', '2']}
        onSelectionChange={onSelectionChange}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    const deselectAllButton = screen.getByText('Bỏ chọn tất cả')
    fireEvent.click(deselectAllButton)
    
    expect(onSelectionChange).toHaveBeenCalledWith([])
  })
})
