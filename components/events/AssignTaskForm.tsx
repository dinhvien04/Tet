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

interface FamilyMemberOption {
  user_id: string
  name?: string
  users?: { id: string; name: string }
}

interface AssignTaskFormProps {
  eventId: string
  familyId: string
  onTaskCreated?: () => void
}

export function AssignTaskForm({ eventId, familyId, onTaskCreated }: AssignTaskFormProps) {
  const [task, setTask] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [members, setMembers] = useState<FamilyMemberOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingMembers, setIsFetchingMembers] = useState(true)

  useEffect(() => {
    async function fetchMembers() {
      try {
        const response = await fetch(`/api/families/${familyId}/members`)
        if (!response.ok) return

        const data = await response.json()
        const memberList = Array.isArray(data) ? data : data.members || []
        setMembers(memberList)
      } catch (error) {
        console.error('Error fetching members:', error)
      } finally {
        setIsFetchingMembers(false)
      }
    }

    void fetchMembers()
  }, [familyId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!task.trim() || !assignedTo) {
      toast.error('Vui long nhap mo ta cong viec va chon nguoi phu trach')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/events/${eventId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: task.trim(),
          assignedTo,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Khong the tao cong viec')
      }

      toast.success('Da phan cong cong viec thanh cong!')
      setTask('')
      setAssignedTo('')
      onTaskCreated?.()
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error(error instanceof Error ? error.message : 'Co loi xay ra')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="task">Mo ta cong viec *</Label>
        <Input
          id="task"
          type="text"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Vi du: Chuan bi mam co, Don dep nha cua"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <Label htmlFor="assignedTo">Nguoi phu trach *</Label>
        <Select
          value={assignedTo}
          onValueChange={setAssignedTo}
          disabled={isLoading || isFetchingMembers}
        >
          <SelectTrigger>
            <SelectValue placeholder="Chon thanh vien" />
          </SelectTrigger>
          <SelectContent>
            {members.map((member) => {
              const memberName = member.name || member.users?.name || 'Thanh vien'
              return (
                <SelectItem key={member.user_id} value={member.user_id}>
                  {memberName}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isLoading || isFetchingMembers} className="w-full">
        {isLoading ? 'Dang tao...' : 'Phan cong'}
      </Button>
    </form>
  )
}
