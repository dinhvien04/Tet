'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { FamilyMember } from '@/types/database'

interface AssignTaskFormProps {
  eventId: string
  familyId: string
  onTaskCreated?: () => void
}

export function AssignTaskForm({ eventId, familyId, onTaskCreated }: AssignTaskFormProps) {
  const [task, setTask] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [members, setMembers] = useState<(FamilyMember & { users: { id: string; name: string } })[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingMembers, setIsFetchingMembers] = useState(true)

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await fetch(`/api/families/${familyId}/members`)
        
        if (response.ok) {
          const data = await response.json()
          setMembers(data)
        }
      } catch (error) {
        console.error('Error fetching members:', error)
      } finally {
        setIsFetchingMembers(false)
      }
    }

    fetchMembers()
  }, [familyId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!task.trim() || !assignedTo) {
      toast.error('Vui lòng nhập mô tả công việc và chọn người phụ trách')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/events/${eventId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: task.trim(),
          assigned_to: assignedTo
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Không thể tạo công việc')
      }

      toast.success('Đã phân công công việc thành công!')
      setTask('')
      setAssignedTo('')
      
      if (onTaskCreated) {
        onTaskCreated()
      }
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="task">Mô tả công việc *</Label>
        <Input
          id="task"
          type="text"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Ví dụ: Chuẩn bị mâm cỗ, Dọn dẹp nhà cửa"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <Label htmlFor="assignedTo">Người phụ trách *</Label>
        <Select
          value={assignedTo}
          onValueChange={setAssignedTo}
          disabled={isLoading || isFetchingMembers}
        >
          <SelectTrigger>
            <SelectValue placeholder="Chọn thành viên" />
          </SelectTrigger>
          <SelectContent>
            {members.map((member) => (
              <SelectItem key={member.user_id} value={member.user_id}>
                {member.users.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isLoading || isFetchingMembers} className="w-full">
        {isLoading ? 'Đang tạo...' : 'Phân công'}
      </Button>
    </form>
  )
}
