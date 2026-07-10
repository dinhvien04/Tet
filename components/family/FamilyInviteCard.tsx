'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface FamilyInviteCardProps {
  inviteCode: string
  familyId?: string
  onInviteCodeChange?: (code: string) => void
}

export function FamilyInviteCard({
  inviteCode: initialCode,
  familyId,
  onInviteCodeChange,
}: FamilyInviteCardProps) {
  const [inviteCode, setInviteCode] = useState(initialCode)
  const [copying, setCopying] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${inviteCode}`

  const handleCopy = async () => {
    try {
      setCopying(true)
      await navigator.clipboard.writeText(inviteLink)
      toast.success('Đã sao chép link mời!')
    } catch {
      toast.error('Không thể sao chép link. Vui lòng thử lại.')
    } finally {
      setCopying(false)
    }
  }

  const handleRegenerate = async () => {
    if (!familyId) return
    if (
      !window.confirm('Tạo mã mời mới? Link mời cũ sẽ không còn dùng được.')
    ) {
      return
    }

    try {
      setRegenerating(true)
      const res = await fetch(`/api/families/${familyId}/invite`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Không thể tạo mã mới')
      }
      const next = data.family?.inviteCode as string
      setInviteCode(next)
      onInviteCodeChange?.(next)
      toast.success('Đã tạo mã mời mới')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-6">
      <div className="space-y-2">
        <Label htmlFor="invite-link">Link mời thành viên</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="invite-link"
            type="text"
            value={inviteLink}
            readOnly
            className="flex-1"
          />
          <Button type="button" onClick={handleCopy} disabled={copying}>
            {copying ? 'Đang sao chép...' : 'Sao chép'}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Chia sẻ link này với các thành viên gia đình để họ có thể tham gia
        </p>
        {familyId && (
          <Button
            type="button"
            variant="outline"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="w-full sm:w-auto"
          >
            {regenerating ? 'Đang tạo mã mới...' : 'Tạo mã mời mới'}
          </Button>
        )}
      </div>
    </div>
  )
}
