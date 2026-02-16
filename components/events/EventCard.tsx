'use client'

import { Event } from '@/types/database'
import { Calendar, MapPin, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

interface EventCardProps {
  event: Event & {
    users?: {
      id: string
      name: string
      avatar?: string
    }
  }
  onClick?: () => void
}

export function EventCard({ event, onClick }: EventCardProps) {
  const router = useRouter()
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

  const isUpcoming = eventDate > new Date()
  const isPast = eventDate < new Date()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      router.push(`/events/${event.id}`)
    }
  }

  return (
    <Card 
      className={`cursor-pointer hover:shadow-lg transition-shadow ${
        isPast ? 'opacity-60' : ''
      }`}
      onClick={handleClick}
    >
      <CardHeader>
        <CardTitle className="flex items-start justify-between">
          <span className="text-lg">{event.title}</span>
          {isUpcoming && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              Sắp tới
            </span>
          )}
          {isPast && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              Đã qua
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{formattedDate} lúc {formattedTime}</span>
        </div>
        
        {event.location && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{event.location}</span>
          </div>
        )}

        {event.users && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-3">
            <User className="w-4 h-4" />
            <span>Tạo bởi {event.users.name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
