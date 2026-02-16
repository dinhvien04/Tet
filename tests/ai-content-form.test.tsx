import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AIContentForm } from '@/components/ai/AIContentForm';
import { toast } from 'sonner';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('AIContentForm Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockReset();
  });

  describe('Form Validation', () => {
    it('should show error when recipient name is empty', async () => {
      const user = userEvent.setup();
      render(<AIContentForm />);

      const traitsInput = screen.getByLabelText(/Đặc điểm/i);
      await user.type(traitsInput, 'hiền lành');

      const generateButton = screen.getByRole('button', { name: /Tạo nội dung/i });
      await user.click(generateButton);

      expect(toast.error).toHaveBeenCalledWith('Vui lòng nhập tên người nhận');
    });

    it('should show error when traits is empty', async () => {
      const user = userEvent.setup();
      render(<AIContentForm />);

      const nameInput = screen.getByLabelText(/Tên người nhận/i);
      await user.type(nameInput, 'Bố');

      const generateButton = screen.getByRole('button', { name: /Tạo nội dung/i });
      await user.click(generateButton);

      expect(toast.error).toHaveBeenCalledWith('Vui lòng nhập đặc điểm');
    });

    it('should trim whitespace from inputs', async () => {
      const user = userEvent.setup();
      render(<AIContentForm />);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: 'Generated content' }),
      });

      const nameInput = screen.getByLabelText(/Tên người nhận/i);
      const traitsInput = screen.getByLabelText(/Đặc điểm/i);

      await user.type(nameInput, '  Bố  ');
      await user.type(traitsInput, '  hiền lành  ');

      const generateButton = screen.getByRole('button', { name: /Tạo nội dung/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/ai/generate',
          expect.objectContaining({
            body: JSON.stringify({
              type: 'cau-doi',
              recipientName: 'Bố',
              traits: 'hiền lành',
            }),
          })
        );
      });
    });
  });

  describe('Content Type Selection', () => {
    it('should default to cau-doi type', () => {
      render(<AIContentForm />);
      const cauDoiButton = screen.getByRole('button', { name: /Câu đối/i });
      // Check if button has the default variant styling (not outline)
      expect(cauDoiButton.className).toContain('bg-primary');
    });

    it('should switch content type when button is clicked', async () => {
      const user = userEvent.setup();
      render(<AIContentForm />);

      const loiChucButton = screen.getByRole('button', { name: /Lời chúc/i });
      await user.click(loiChucButton);

      // Check if button has the active variant styling
      expect(loiChucButton.className).toContain('bg-primary');
    });

    it('should send correct type to API', async () => {
      const user = userEvent.setup();
      render(<AIContentForm />);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: 'Generated content' }),
      });

      const thiepTetButton = screen.getByRole('button', { name: /Thiệp Tết/i });
      await user.click(thiepTetButton);

      const nameInput = screen.getByLabelText(/Tên người nhận/i);
      const traitsInput = screen.getByLabelText(/Đặc điểm/i);

      await user.type(nameInput, 'Mẹ');
      await user.type(traitsInput, 'yêu thương');

      const generateButton = screen.getByRole('button', { name: /Tạo nội dung/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/ai/generate',
          expect.objectContaining({
            body: JSON.stringify({
              type: 'thiep-tet',
              recipientName: 'Mẹ',
              traits: 'yêu thương',
            }),
          })
        );
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state during generation', async () => {
      const user = userEvent.setup();
      render(<AIContentForm />);

      (global.fetch as any).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const nameInput = screen.getByLabelText(/Tên người nhận/i);
      const traitsInput = screen.getByLabelText(/Đặc điểm/i);

      await user.type(nameInput, 'Bố');
      await user.type(traitsInput, 'hiền lành');

      const generateButton = screen.getByRole('button', { name: /Tạo nội dung/i });
      await user.click(generateButton);

      expect(screen.getByText(/Đang tạo.../i)).toBeInTheDocument();
      expect(generateButton).toBeDisabled();
    });

    it('should disable inputs during generation', async () => {
      const user = userEvent.setup();
      render(<AIContentForm />);

      (global.fetch as any).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const nameInput = screen.getByLabelText(/Tên người nhận/i);
      const traitsInput = screen.getByLabelText(/Đặc điểm/i);

      await user.type(nameInput, 'Bố');
      await user.type(traitsInput, 'hiền lành');

      const generateButton = screen.getByRole('button', { name: /Tạo nội dung/i });
      await user.click(generateButton);

      expect(nameInput).toBeDisabled();
      expect(traitsInput).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should show error message on API failure', async () => {
      const user = userEvent.setup();
      render(<AIContentForm />);

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'API error' }),
      });

      const nameInput = screen.getByLabelText(/Tên người nhận/i);
      const traitsInput = screen.getByLabelText(/Đặc điểm/i);

      await user.type(nameInput, 'Bố');
      await user.type(traitsInput, 'hiền lành');

      const generateButton = screen.getByRole('button', { name: /Tạo nội dung/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('API error');
      });
    });

    it('should show timeout error on request timeout', async () => {
      const user = userEvent.setup();
      render(<AIContentForm />);

      (global.fetch as any).mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          const error = new Error('Timeout');
          error.name = 'AbortError';
          setTimeout(() => reject(error), 50);
        });
      });

      const nameInput = screen.getByLabelText(/Tên người nhận/i);
      const traitsInput = screen.getByLabelText(/Đặc điểm/i);

      await user.type(nameInput, 'Bố');
      await user.type(traitsInput, 'hiền lành');

      const generateButton = screen.getByRole('button', { name: /Tạo nội dung/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Yêu cầu quá lâu. Vui lòng thử lại.');
      });
    });

    it('should show retry button after error', async () => {
      const user = userEvent.setup();
      render(<AIContentForm />);

      // First request fails
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'API error' }),
      });

      const nameInput = screen.getByLabelText(/Tên người nhận/i);
      const traitsInput = screen.getByLabelText(/Đặc điểm/i);

      await user.type(nameInput, 'Bố');
      await user.type(traitsInput, 'hiền lành');

      const generateButton = screen.getByRole('button', { name: /Tạo nội dung/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      // Should still be able to retry
      expect(generateButton).not.toBeDisabled();
    });
  });

  describe('Success Flow', () => {
    it('should display generated content on success', async () => {
      const user = userEvent.setup();
      render(<AIContentForm />);

      const generatedContent = 'Xuân về đất nước hoa tươi\nPhúc lộc đầy nhà người người vui vẻ';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: generatedContent }),
      });

      const nameInput = screen.getByLabelText(/Tên người nhận/i);
      const traitsInput = screen.getByLabelText(/Đặc điểm/i);

      await user.type(nameInput, 'Bố');
      await user.type(traitsInput, 'hiền lành');

      const generateButton = screen.getByRole('button', { name: /Tạo nội dung/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/Nội dung đã tạo:/i)).toBeInTheDocument();
      });

      // Check that the content is displayed (using a more flexible matcher)
      const contentElement = screen.getByText((content, element) => {
        return element?.textContent === generatedContent;
      });
      expect(contentElement).toBeInTheDocument();
    });

    it('should show success toast on generation', async () => {
      const user = userEvent.setup();
      render(<AIContentForm />);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: 'Generated content' }),
      });

      const nameInput = screen.getByLabelText(/Tên người nhận/i);
      const traitsInput = screen.getByLabelText(/Đặc điểm/i);

      await user.type(nameInput, 'Bố');
      await user.type(traitsInput, 'hiền lành');

      const generateButton = screen.getByRole('button', { name: /Tạo nội dung/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Tạo nội dung thành công!');
      });
    });

    it('should call onContentGenerated callback', async () => {
      const user = userEvent.setup();
      const onContentGenerated = vi.fn();
      render(<AIContentForm onContentGenerated={onContentGenerated} />);

      const generatedContent = 'Generated content';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: generatedContent }),
      });

      const nameInput = screen.getByLabelText(/Tên người nhận/i);
      const traitsInput = screen.getByLabelText(/Đặc điểm/i);

      await user.type(nameInput, 'Bố');
      await user.type(traitsInput, 'hiền lành');

      const generateButton = screen.getByRole('button', { name: /Tạo nội dung/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(onContentGenerated).toHaveBeenCalledWith(generatedContent, 'cau-doi');
      });
    });

    it('should show retry button after successful generation', async () => {
      const user = userEvent.setup();
      render(<AIContentForm />);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: 'Generated content' }),
      });

      const nameInput = screen.getByLabelText(/Tên người nhận/i);
      const traitsInput = screen.getByLabelText(/Đặc điểm/i);

      await user.type(nameInput, 'Bố');
      await user.type(traitsInput, 'hiền lành');

      const generateButton = screen.getByRole('button', { name: /Tạo nội dung/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/Nội dung đã tạo:/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /Tạo lại/i });
      expect(retryButton).toBeInTheDocument();
    });
  });
});
