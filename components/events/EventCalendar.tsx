'use client'

import { useEffect, useState, useCallback } from 'react'
import { Event } from '@/types/database'
import { EventCard } from './EventCard'
import { CreateEventForm } from './CreateEventForm'
import { Button } from '@/components/ui/button'
import { Plus, Calendar } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { EmptyState } from '@/components/ui/empty-state'

interface EventCalendarProps {
  familyId: string
}

export function EventCalendar({ familyId }: EventCalendarProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetch(`/api/events?familyId=${familyId}`)
      
      if (!response.ok) {
        throw new Error('Không thể tải danh sách sự kiện')
      }

      const data = await response.json()
      setEvents(data.events || []) // Fix: API returns { events: [...] }
    } catch (error) {
      console.error('Error fetching events:', error)
      toast.error('Không thể tải danh sách sự kiện')
      setEvents([]) // Set empty array on error
    } finally {
      setIsLoading(false)
    }
  }, [familyId])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleEventCreated = () => {
    setIsDialogOpen(false)
    fetchEvents()
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Lịch sự kiện</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Tạo sự kiện
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo sự kiện mới</DialogTitle>
            </DialogHeader>
            <CreateEventForm 
              familyId={familyId} 
              onEventCreated={handleEventCreated}
            />
          </DialogContent>
        </Dialog>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Chưa có sự kiện nào"
          description="Tạo sự kiện đầu tiên cho gia đình bạn!"
          action={{
            label: 'Tạo sự kiện',
            onClick: () => setIsDialogOpen(true)
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
