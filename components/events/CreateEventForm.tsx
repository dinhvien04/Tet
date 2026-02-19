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
      toast.error('Vui long nhap tieu de va ngay')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId,
          title: title.trim(),
          date: new Date(date).toISOString(),
          location: location.trim() || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Khong the tao su kien')
      }

      toast.success('Da tao su kien thanh cong!')
      setTitle('')
      setDate('')
      setLocation('')
      onEventCreated?.()
    } catch (error) {
      console.error('Error creating event:', error)
      toast.error(error instanceof Error ? error.message : 'Co loi xay ra')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Tieu de su kien *</Label>
        <Input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Vi du: Cung tat nien, Mung 1 Tet"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <Label htmlFor="date">Ngay *</Label>
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
        <Label htmlFor="location">Dia diem</Label>
        <Input
          id="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Vi du: Nha ong ba noi"
          disabled={isLoading}
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Dang tao...' : 'Tao su kien'}
      </Button>
    </form>
  )
}
