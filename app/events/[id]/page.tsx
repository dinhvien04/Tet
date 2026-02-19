'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { EventDetail } from '@/components/events/EventDetail'

export default function EventPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const id = params.id as string

  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      const fetchEvent = async () => {
        try {
          const response = await fetch(`/api/events/${id}`)
          
          if (!response.ok) {
            if (response.status === 403) {
              setError('Bạn không có quyền truy cập sự kiện này')
            } else if (response.status === 404) {
              setError('Không tìm thấy sự kiện')
            } else {
              setError('Không thể tải sự kiện')
            }
            return
          }

          const data = await response.json()
          setEvent(data)
        } catch (err) {
          console.error('Error fetching event:', err)
          setError('Có lỗi xảy ra khi tải sự kiện')
        } finally {
          setLoading(false)
        }
      }

      fetchEvent()
    }
  }, [id, status, router])

  if (loading || status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {error || 'Không tìm thấy sự kiện'}
          </h1>
          <p className="text-gray-600 mt-2">
            {error || 'Sự kiện này không tồn tại hoặc bạn không có quyền truy cập.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <EventDetail
        event={event}
        familyId={event.family_id}
        currentUserId={session?.user?.id || ''}
      />
    </div>
  )
}
