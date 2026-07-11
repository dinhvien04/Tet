'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type RsvpStatus = 'going' | 'maybe' | 'not_going'

const LABELS: Record<RsvpStatus, string> = {
  going: 'Tham gia',
  maybe: 'Chưa chắc',
  not_going: 'Không tham gia',
}

interface EventRsvpProps {
  eventId: string
}

export function EventRsvp({ eventId }: EventRsvpProps) {
  const [myStatus, setMyStatus] = useState<RsvpStatus | null>(null)
  const [counts, setCounts] = useState({ going: 0, maybe: 0, not_going: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMyStatus(data.myStatus)
      setCounts(data.counts || { going: 0, maybe: 0, not_going: 0 })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    void load()
  }, [load])

  const setStatus = async (status: RsvpStatus) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Không lưu được')
      setMyStatus(status)
      await load()
      toast.success(`Đã chọn: ${LABELS[status]}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lỗi RSVP')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Đang tải RSVP...</p>
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Bạn có tham gia không?</h3>
        <p className="text-xs text-muted-foreground">
          Có {counts.going} · Chưa chắc {counts.maybe} · Không {counts.not_going}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(LABELS) as RsvpStatus[]).map((status) => (
          <Button
            key={status}
            type="button"
            size="sm"
            variant={myStatus === status ? 'default' : 'outline'}
            disabled={saving}
            onClick={() => setStatus(status)}
            aria-pressed={myStatus === status}
          >
            {LABELS[status]}
          </Button>
        ))}
      </div>
    </div>
  )
}
