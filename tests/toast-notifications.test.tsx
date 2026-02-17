import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'

// Mock components that use toast
import { FamilyInviteCard } from '@/components/family/FamilyInviteCard'
import { CreateFamilyForm } from '@/components/family/CreateFamilyForm'
import { AIContentForm } from '@/components/ai/AIContentForm'
import { PhotoUploader } from '@/components/photos/PhotoUploader'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn()
  }),
  usePathname: () => '/',
}))

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } })
    }
  },
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } })
    }
  })
}))

describe('Toast Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Success Messages', () => {
    it('should show success toast when copying invite link', async () => {
      // Mock clipboard API
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: vi.fn().mockResolvedValue(undefined)
        },
        writable: true,
        configurable: true
      })

      const toastSpy = vi.spyOn(toast, 'success')

      render(
        <>
          <FamilyInviteCard inviteCode="TEST123" />
          <Toaster />
        </>
      )

      const copyButton = screen.getByRole('button', { name: /sao chép/i })
      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(toastSpy).toHaveBeenCalledWith('Đã sao chép link mời!')
      })
    })

    it('should show success toast when photo upload succeeds', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: '1', url: 'test.jpg' })
      })

      const toastSpy = vi.spyOn(toast, 'success')

      render(
        <>
          <PhotoUploader familyId="family-1" />
          <Toaster />
        </>
      )

      // Create a mock file
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      // Simulate file selection
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false
      })
      fireEvent.change(input)

      // Wait for preview to appear
      await waitFor(() => {
        expect(screen.getByAltText('Preview')).toBeInTheDocument()
      })

      // Click upload button
      const uploadButton = screen.getByRole('button', { name: /upload ảnh/i })
      fireEvent.click(uploadButton)

      await waitFor(() => {
        expect(toastSpy).toHaveBeenCalledWith('Upload ảnh thành công!')
      })
    })

    it('should show success toast when AI content is generated', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: 'Test content' })
      })

      const toastSpy = vi.spyOn(toast, 'success')

      render(
        <>
          <AIContentForm />
          <Toaster />
        </>
      )

      // Fill in form
      const nameInput = screen.getByLabelText(/tên người nhận/i)
      const traitsInput = screen.getByLabelText(/đặc điểm/i)
      
      fireEvent.change(nameInput, { target: { value: 'Bố' } })
      fireEvent.change(traitsInput, { target: { value: 'hiền lành' } })

      // Click generate button
      const generateButton = screen.getByRole('button', { name: /tạo nội dung/i })
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(toastSpy).toHaveBeenCalledWith('Tạo nội dung thành công!')
      })
    })
  })

  describe('Error Messages', () => {
    it('should show error toast when copying invite link fails', async () => {
      // Mock clipboard API to fail
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: vi.fn().mockRejectedValue(new Error('Clipboard error'))
        },
        writable: true,
        configurable: true
      })

      const toastSpy = vi.spyOn(toast, 'error')

      render(
        <>
          <FamilyInviteCard inviteCode="TEST123" />
          <Toaster />
        </>
      )

      const copyButton = screen.getByRole('button', { name: /sao chép/i })
      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(toastSpy).toHaveBeenCalledWith('Không thể sao chép link. Vui lòng thử lại.')
      })
    })

    it('should show error toast for invalid file type', async () => {
      const toastSpy = vi.spyOn(toast, 'error')

      render(
        <>
          <PhotoUploader familyId="family-1" />
          <Toaster />
        </>
      )

      // Create an invalid file
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false
      })
      fireEvent.change(input)

      await waitFor(() => {
        expect(toastSpy).toHaveBeenCalledWith('Định dạng file không hợp lệ. Chỉ chấp nhận JPG, PNG, HEIC.')
      })
    })

    it('should show error toast for file too large', async () => {
      const toastSpy = vi.spyOn(toast, 'error')

      render(
        <>
          <PhotoUploader familyId="family-1" />
          <Toaster />
        </>
      )

      // Create a large file (11MB)
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      Object.defineProperty(input, 'files', {
        value: [largeFile],
        writable: false
      })
      fireEvent.change(input)

      await waitFor(() => {
        expect(toastSpy).toHaveBeenCalledWith('File quá lớn. Kích thước tối đa 10MB.')
      })
    })

    it('should show error toast when photo upload fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Upload failed' })
      })

      const toastSpy = vi.spyOn(toast, 'error')

      render(
        <>
          <PhotoUploader familyId="family-1" />
          <Toaster />
        </>
      )

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false
      })
      fireEvent.change(input)

      await waitFor(() => {
        expect(screen.getByAltText('Preview')).toBeInTheDocument()
      })

      const uploadButton = screen.getByRole('button', { name: /upload ảnh/i })
      fireEvent.click(uploadButton)

      await waitFor(() => {
        expect(toastSpy).toHaveBeenCalledWith('Upload failed')
      })
    })

    it('should show error toast for AI generation validation', async () => {
      const toastSpy = vi.spyOn(toast, 'error')

      render(
        <>
          <AIContentForm />
          <Toaster />
        </>
      )

      // Try to generate without filling form
      const generateButton = screen.getByRole('button', { name: /tạo nội dung/i })
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(toastSpy).toHaveBeenCalledWith('Vui lòng nhập tên người nhận')
      })
    })

    it('should show error toast when AI generation fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'AI service unavailable' })
      })

      const toastSpy = vi.spyOn(toast, 'error')

      render(
        <>
          <AIContentForm />
          <Toaster />
        </>
      )

      const nameInput = screen.getByLabelText(/tên người nhận/i)
      const traitsInput = screen.getByLabelText(/đặc điểm/i)
      
      fireEvent.change(nameInput, { target: { value: 'Bố' } })
      fireEvent.change(traitsInput, { target: { value: 'hiền lành' } })

      const generateButton = screen.getByRole('button', { name: /tạo nội dung/i })
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(toastSpy).toHaveBeenCalledWith('AI service unavailable')
      })
    })
  })

  describe('Info Messages', () => {
    it('should be able to show info toast', () => {
      const toastSpy = vi.spyOn(toast, 'info')
      
      toast.info('Đang xử lý yêu cầu của bạn...')
      
      expect(toastSpy).toHaveBeenCalledWith('Đang xử lý yêu cầu của bạn...')
    })

    it('should be able to show info toast with custom duration', () => {
      const toastSpy = vi.spyOn(toast, 'info')
      
      toast.info('Thông báo quan trọng', { duration: 10000 })
      
      expect(toastSpy).toHaveBeenCalledWith('Thông báo quan trọng', { duration: 10000 })
    })
  })

  describe('Warning Messages', () => {
    it('should be able to show warning toast', () => {
      const toastSpy = vi.spyOn(toast, 'warning')
      
      toast.warning('Bạn chưa lưu thay đổi')
      
      expect(toastSpy).toHaveBeenCalledWith('Bạn chưa lưu thay đổi')
    })
  })

  describe('Loading Messages', () => {
    it('should be able to show loading toast and update it', async () => {
      const loadingSpy = vi.spyOn(toast, 'loading')
      const successSpy = vi.spyOn(toast, 'success')
      
      const toastId = toast.loading('Đang upload...')
      expect(loadingSpy).toHaveBeenCalledWith('Đang upload...')
      
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 100))
      
      toast.success('Upload thành công!', { id: toastId })
      expect(successSpy).toHaveBeenCalledWith('Upload thành công!', { id: toastId })
    })
  })

  describe('Toast with Actions', () => {
    it('should be able to show toast with action button', () => {
      const toastSpy = vi.spyOn(toast, 'error')
      const retryFn = vi.fn()
      
      toast.error('Upload thất bại', {
        action: {
          label: 'Thử lại',
          onClick: retryFn
        }
      })
      
      expect(toastSpy).toHaveBeenCalledWith('Upload thất bại', {
        action: {
          label: 'Thử lại',
          onClick: retryFn
        }
      })
    })
  })

  describe('Integration with Components', () => {
    it('should show toast when creating family succeeds', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ 
          id: '1', 
          name: 'Test Family', 
          invite_code: 'ABC123' 
        })
      })

      const toastSpy = vi.spyOn(toast, 'success')

      render(
        <>
          <CreateFamilyForm />
          <Toaster />
        </>
      )

      const nameInput = screen.getByLabelText(/tên nhà/i)
      fireEvent.change(nameInput, { target: { value: 'Test Family' } })

      const submitButton = screen.getByRole('button', { name: /tạo nhà/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(toastSpy).toHaveBeenCalledWith('Tạo nhà "Test Family" thành công!')
      })
    })

    it('should show toast when creating family fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Database error' })
      })

      const toastSpy = vi.spyOn(toast, 'error')

      render(
        <>
          <CreateFamilyForm />
          <Toaster />
        </>
      )

      const nameInput = screen.getByLabelText(/tên nhà/i)
      fireEvent.change(nameInput, { target: { value: 'Test Family' } })

      const submitButton = screen.getByRole('button', { name: /tạo nhà/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(toastSpy).toHaveBeenCalledWith('Database error')
      })
    })
  })
})
