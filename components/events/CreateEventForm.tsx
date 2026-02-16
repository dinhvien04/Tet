'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface CreateEventFormProps {
  familyId: string
  onEventCreated?: () => void
}

export function CreateEventForm({ familyId, onEventCreated }: CreateEventFormProps) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [location, setLocation] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim() || !date) {
      toast.error('Vui lòng nhập tiêu đề và ngày')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_id: familyId,
          title: title.trim(),
          date: new Date(date).toISOString(),
          location: location.trim() || null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Không thể tạo sự kiện')
      }

      toast.success('Đã tạo sự kiện thành công!')
      setTitle('')
      setDate('')
      setLocation('')
      
      if (onEventCreated) {
        onEventCreated()
      }
    } catch (error) {
      console.error('Error creating event:', error)
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Tiêu đề sự kiện *</Label>
        <Input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ví dụ: Cúng tất niên, Mùng 1 Tết"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <Label htmlFor="date">Ngày *</Label>
        <Input
          id="date"
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <Label htmlFor="location">Địa điểm</Label>
        <Input
          id="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Ví dụ: Nhà ông bà nội"
          disabled={isLoading}
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Đang tạo...' : 'Tạo sự kiện'}
      </Button>
    </form>
  )
}
