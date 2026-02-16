'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface FamilyInviteCardProps {
  inviteCode: string
}

export function FamilyInviteCard({ inviteCode }: FamilyInviteCardProps) {
  const [copying, setCopying] = useState(false)
  
  const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${inviteCode}`

  const handleCopy = async () => {
    try {
      setCopying(true)
      await navigator.clipboard.writeText(inviteLink)
      toast.success('Đã sao chép link mời!')
    } catch (error) {
      toast.error('Không thể sao chép link. Vui lòng thử lại.')
    } finally {
      setCopying(false)
    }
  }

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="invite-link">Link mời thành viên</Label>
        <div className="flex gap-2">
          <Input
            id="invite-link"
            type="text"
            value={inviteLink}
            readOnly
            className="flex-1"
          />
          <Button 
            type="button"
            onClick={handleCopy}
            disabled={copying}
          >
            {copying ? 'Đang sao chép...' : 'Sao chép'}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Chia sẻ link này với các thành viên gia đình để họ có thể tham gia
        </p>
      </div>
    </div>
  )
}
