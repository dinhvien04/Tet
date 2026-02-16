import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TaskItem } from '@/components/events/TaskItem'
import { toast } from 'sonner'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

global.fetch = vi.fn()

describe('TaskItem', () => {
  const mockTask = {
    id: 'task-1',
    event_id: 'event-1',
    task: 'Chuẩn bị mâm cỗ',
    assigned_to: 'user-1',
    status: 'pending' as const,
    created_at: '2025-01-01T00:00:00.000Z',
    users: {
      id: 'user-1',
      name: 'John Doe',
      avatar: 'https://example.com/avatar.jpg'
    }
  }

  const mockOnTaskUpdated = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render task with user info', () => {
    render(<TaskItem task={mockTask} />)

    expect(screen.getByText('Chuẩn bị mâm cỗ')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('should highlight task assigned to current user', () => {
    const { container } = render(
      <TaskItem task={mockTask} currentUserId="user-1" />
    )

    expect(screen.getByText(/\(Bạn\)/i)).toBeInTheDocument()
    expect(container.querySelector('.bg-blue-50')).toBeInTheDocument()
  })

  it('should toggle task status when checkbox is clicked', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockTask, status: 'completed' })
    })

    render(
      <TaskItem 
        task={mockTask} 
        onTaskUpdated={mockOnTaskUpdated}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()

    fireEvent.click(checkbox)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(`/api/tasks/${mockTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      })
      expect(toast.success).toHaveBeenCalledWith('Đã đánh dấu hoàn thành!')
      expect(mockOnTaskUpdated).toHaveBeenCalled()
    })
  })

  it('should show completed task with strikethrough', () => {
    const completedTask = { ...mockTask, status: 'completed' as const }
    render(<TaskItem task={completedTask} />)

    const taskText = screen.getByText('Chuẩn bị mâm cỗ')
    expect(taskText).toHaveClass('line-through')
  })

  it('should handle toggle errors', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to update' })
    })

    render(<TaskItem task={mockTask} />)

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Không thể cập nhật trạng thái')
    })
  })

  it('should disable checkbox during update', async () => {
    ;(global.fetch as any).mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 100))
    )

    render(<TaskItem task={mockTask} />)

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    expect(checkbox).toBeDisabled()

    await waitFor(() => {
      expect(checkbox).not.toBeDisabled()
    })
  })
})
