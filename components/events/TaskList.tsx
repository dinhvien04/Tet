'use client'

import { useEffect, useState } from 'react'
import { EventTask } from '@/types/database'
import { TaskItem } from './TaskItem'
import { toast } from 'sonner'

interface TaskListProps {
  eventId: string
  currentUserId?: string
  refreshTrigger?: number
}

export function TaskList({ eventId, currentUserId, refreshTrigger }: TaskListProps) {
  const [tasks, setTasks] = useState<EventTask[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTasks = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/tasks`)
      
      if (!response.ok) {
        throw new Error('Không thể tải danh sách công việc')
      }

      const data = await response.json()
      setTasks(data)
    } catch (error) {
      console.error('Error fetching tasks:', error)
      toast.error('Không thể tải danh sách công việc')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [eventId, refreshTrigger])

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 text-sm">
        Chưa có công việc nào
      </div>
    )
  }

  const pendingTasks = tasks.filter(t => t.status === 'pending')
  const completedTasks = tasks.filter(t => t.status === 'completed')

  return (
    <div className="space-y-4">
      {pendingTasks.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Chưa hoàn thành ({pendingTasks.length})
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
            Đã hoàn thành ({completedTasks.length})
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
