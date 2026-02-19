'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { Family } from '@/types/database'

export default function JoinFamilyPage() {
  const router = useRouter()
  const params = useParams()
  const inviteCode = params.inviteCode as string
  const { status } = useSession()

  const [family, setFamily] = useState<Family | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isAuthenticated = status === 'authenticated'

  useEffect(() => {
    async function loadFamily() {
      try {
        const response = await fetch(`/api/families?inviteCode=${inviteCode}`)
        if (!response.ok) {
          setError('Ma moi khong hop le hoac da het han')
          return
        }

        const data = await response.json()
        if (data.families && data.families.length > 0) {
          setFamily(data.families[0])
        } else {
          setError('Ma moi khong hop le hoac da het han')
        }
      } catch {
        setError('Co loi xay ra khi tai thong tin')
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
      router.push(`/login?redirect=/join/${inviteCode}`)
      return
    }

    if (!family) return

    try {
      setJoining(true)

      const response = await fetch(`/api/families/${inviteCode}/join`, {
        method: 'POST',
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Khong the tham gia nha')
      }

      toast.success('Tham gia nha thanh cong!')
      router.push('/dashboard')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Co loi xay ra'
      toast.error(message)
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Dang tai...</p>
      </div>
    )
  }

  if (error || !family) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold">Khong tim thay nha</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => router.push('/dashboard')}>Ve trang chu</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Loi moi tham gia nha</h1>
          <p className="text-muted-foreground">Ban duoc moi tham gia nha gia dinh</p>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-center">{family.name}</h2>
            <p className="text-sm text-muted-foreground text-center">
              Ma moi: {family.invite_code}
            </p>
          </div>

          <div className="pt-4">
            {!isAuthenticated ? (
              <Button onClick={handleJoin} className="w-full h-12">
                Dang nhap va tham gia
              </Button>
            ) : (
              <Button onClick={handleJoin} disabled={joining} className="w-full h-12">
                {joining ? 'Dang tham gia...' : 'Tham gia nha'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
