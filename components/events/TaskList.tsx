'use client'

import { useEffect, useState, useCallback } from 'react'
import { EventTask } from '@/types/database'
import { TaskItem } from './TaskItem'
import { toast } from 'sonner'
import { EmptyState } from '@/components/ui/empty-state'
import { CheckSquare } from 'lucide-react'

interface TaskListProps {
  eventId: string
  currentUserId?: string
  refreshTrigger?: number
}

export function TaskList({ eventId, currentUserId, refreshTrigger }: TaskListProps) {
  const [tasks, setTasks] = useState<EventTask[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/tasks`)
      if (!response.ok) {
        throw new Error('Khong the tai danh sach cong viec')
      }

      const data = await response.json()
      const taskList = Array.isArray(data) ? data : data.tasks || []
      setTasks(taskList)
    } catch (error) {
      console.error('Error fetching tasks:', error)
      toast.error('Khong the tai danh sach cong viec')
    } finally {
      setIsLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    void fetchTasks()
  }, [fetchTasks, refreshTrigger])

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={CheckSquare}
        title="Chua co cong viec nao"
        description="Them cong viec de phan cong cho cac thanh vien"
        className="py-6"
      />
    )
  }

  const pendingTasks = tasks.filter((t) => t.status === 'pending')
  const completedTasks = tasks.filter((t) => t.status === 'completed')

  return (
    <div className="space-y-4">
      {pendingTasks.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Chua hoan thanh ({pendingTasks.length})
          </h4>
          <div className="space-y-2">
            {pendingTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                currentUserId={currentUserId}
                onTaskUpdated={fetchTasks}
              />
            ))}
          </div>
        </div>
      )}

      {completedTasks.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Da hoan thanh ({completedTasks.length})
          </h4>
          <div className="space-y-2">
            {completedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                currentUserId={currentUserId}
                onTaskUpdated={fetchTasks}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
