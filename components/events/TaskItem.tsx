'use client'

import { EventTask } from '@/types/database'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { useState } from 'react'

interface TaskItemProps {
  task: EventTask & {
    users?: {
      id: string
      name: string
      avatar?: string
    }
  }
  currentUserId?: string
  onTaskUpdated?: () => void
}

export function TaskItem({ task, currentUserId, onTaskUpdated }: TaskItemProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const isAssignedToCurrentUser = task.assigned_to === currentUserId

  const handleToggle = async () => {
    setIsUpdating(true)
    
    try {
      const newStatus = task.status === 'pending' ? 'completed' : 'pending'
      
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error('Không thể cập nhật trạng thái')
      }

      toast.success(
        newStatus === 'completed' 
          ? 'Đã đánh dấu hoàn thành!' 
          : 'Đã đánh dấu chưa hoàn thành'
      )
      
      if (onTaskUpdated) {
        onTaskUpdated()
      }
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Không thể cập nhật trạng thái')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div 
      className={`flex items-start gap-3 p-3 rounded-lg border ${
        isAssignedToCurrentUser ? 'bg-blue-50 border-blue-200' : 'bg-white'
      } ${task.status === 'completed' ? 'opacity-60' : ''}`}
    >
      <Checkbox
        checked={task.status === 'completed'}
        onCheckedChange={handleToggle}
        disabled={isUpdating}
        className="mt-1"
      />
      
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
          {task.task}
        </p>
        
        {task.users && (
          <div className="flex items-center gap-2 mt-2">
            <Avatar className="w-5 h-5">
              <AvatarImage src={task.users.avatar} />
              <AvatarFallback className="text-xs">
                {task.users.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-gray-600">
              {task.users.name}
              {isAssignedToCurrentUser && ' (Bạn)'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
