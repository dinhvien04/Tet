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
import { cn } from '@/lib/utils'

type EventFilter = 'all' | 'upcoming' | 'past'

interface EventCalendarProps {
  familyId: string
}

export function EventCalendar({ familyId }: EventCalendarProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [filter, setFilter] = useState<EventFilter>('upcoming')

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(
        `/api/events?familyId=${familyId}&filter=${filter}`
      )

      if (!response.ok) {
        throw new Error('Không thể tải danh sách sự kiện')
      }

      const data = await response.json()
      setEvents(data.events || [])
    } catch (error) {
      console.error('Error fetching events:', error)
      toast.error('Không thể tải danh sách sự kiện')
      setEvents([])
    } finally {
      setIsLoading(false)
    }
  }, [familyId, filter])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleEventCreated = () => {
    setIsDialogOpen(false)
    fetchEvents()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">Lịch sự kiện</h2>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'upcoming', label: 'Sắp tới' },
              { id: 'past', label: 'Đã qua' },
              { id: 'all', label: 'Tất cả' },
            ] as const
          ).map((tab) => (
            <Button
              key={tab.id}
              type="button"
              size="sm"
              variant={filter === tab.id ? 'default' : 'outline'}
              onClick={() => setFilter(tab.id)}
              className={cn(filter === tab.id && 'shadow-sm')}
            >
              {tab.label}
            </Button>
          ))}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Tạo sự kiện
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tạo sự kiện mới</DialogTitle>
              </DialogHeader>
              <CreateEventForm familyId={familyId} onEventCreated={handleEventCreated} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={
            filter === 'upcoming'
              ? 'Chưa có sự kiện sắp tới'
              : filter === 'past'
                ? 'Chưa có sự kiện đã qua'
                : 'Chưa có sự kiện nào'
          }
          description="Tạo sự kiện đầu tiên cho gia đình bạn!"
          action={{
            label: 'Tạo sự kiện',
            onClick: () => setIsDialogOpen(true),
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
