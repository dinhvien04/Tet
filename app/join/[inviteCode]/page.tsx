'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { Family } from '@/types/database'
import { getSafeRedirectPath } from '@/lib/safe-redirect'

export default function JoinFamilyPage() {
  const router = useRouter()
  const params = useParams()
  const inviteCode = params.inviteCode as string
  const { status } = useSession()

  const [family, setFamily] = useState<Family | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const isAuthenticated = status === 'authenticated'

  useEffect(() => {
    async function loadFamily() {
      try {
        const response = await fetch(`/api/families?inviteCode=${inviteCode}`)
        if (!response.ok) {
          setError('Mã mời không hợp lệ hoặc đã hết hạn')
          return
        }

        const data = await response.json()
        if (data.families && data.families.length > 0) {
          setFamily(data.families[0])
        } else {
          setError('Mã mời không hợp lệ hoặc đã hết hạn')
        }
      } catch {
        setError('Có lỗi xảy ra khi tải thông tin')
      } finally {
        setLoading(false)
      }
    }

    if (status !== 'loading') {
      void loadFamily()
    }
  }, [inviteCode, status])

  const handleJoin = async () => {
    if (!isAuthenticated) {
      const path = getSafeRedirectPath(`/join/${inviteCode}`)
      router.push(`/login?redirect=${encodeURIComponent(path)}`)
      return
    }

    if (!family) return

    try {
      setJoining(true)

      const response = await fetch(`/api/families/${inviteCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Không thể tham gia nhà')
      }

      if (result.pending) {
        setPending(true)
        toast.success(result.message || 'Đã gửi yêu cầu, chờ admin duyệt')
      } else {
        toast.success('Tham gia nhà thành công!')
        router.push('/dashboard')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra'
      toast.error(message)
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Đang tải...</p>
      </div>
    )
  }

  if (error || !family) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-bold">Không tìm thấy nhà</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => router.push('/dashboard')}>Về trang chủ</Button>
        </div>
      </div>
    )
  }

  if (pending) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-card p-6 text-center">
          <h1 className="text-2xl font-bold text-primary">Đã gửi yêu cầu</h1>
          <p className="text-muted-foreground">
            Yêu cầu tham gia <strong>{family.name}</strong> đang chờ admin duyệt.
          </p>
          <Button onClick={() => router.push('/dashboard')}>Về Dashboard</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Lời mời tham gia nhà</h1>
          <p className="text-muted-foreground">Bạn được mời tham gia nhà gia đình</p>
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <div className="space-y-2">
            <h2 className="text-center text-2xl font-semibold">{family.name}</h2>
            <p className="text-center text-sm text-muted-foreground">
              Mã mời: {family.invite_code}
            </p>
          </div>

          <div className="pt-4">
            {!isAuthenticated ? (
              <Button onClick={handleJoin} className="h-12 w-full">
                Đăng nhập và tham gia
              </Button>
            ) : (
              <Button onClick={handleJoin} disabled={joining} className="h-12 w-full">
                {joining ? 'Đang xử lý...' : 'Tham gia nhà'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
