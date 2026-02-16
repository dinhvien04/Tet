'use client'

import { useState } from 'react'
import { Event } from '@/types/database'
import { Calendar, MapPin, User, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TaskList } from './TaskList'
import { AssignTaskForm } from './AssignTaskForm'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface EventDetailProps {
  event: Event & {
    users?: {
      id: string
      name: string
      avatar?: string
    }
  }
  familyId: string
  currentUserId?: string
}

export function EventDetail({ event, familyId, currentUserId }: EventDetailProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const eventDate = new Date(event.date)
  const formattedDate = eventDate.toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const formattedTime = eventDate.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  })

  const handleTaskCreated = () => {
    setIsDialogOpen(false)
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{event.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-5 h-5" />
            <span>{formattedDate} lúc {formattedTime}</span>
          </div>
          
          {event.location && (
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-5 h-5" />
              <span>{event.location}</span>
            </div>
          )}

          {event.users && (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <User className="w-4 h-4" />
              <span>Tạo bởi {event.users.name}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Công việc</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm công việc
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Phân công công việc</DialogTitle>
                </DialogHeader>
                <AssignTaskForm
                  eventId={event.id}
                  familyId={familyId}
                  onTaskCreated={handleTaskCreated}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <TaskList
            eventId={event.id}
            currentUserId={currentUserId}
            refreshTrigger={refreshTrigger}
          />
        </CardContent>
      </Card>
    </div>
  )
}
