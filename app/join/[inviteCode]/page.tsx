'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { Family } from '@/types/database'

export default function JoinFamilyPage() {
  const router = useRouter()
  const params = useParams()
  const inviteCode = params.inviteCode as string

  const [family, setFamily] = useState<Family | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuthAndLoadFamily = async () => {
      try {
        // Check authentication
        const { data: { session } } = await supabase.auth.getSession()
        setIsAuthenticated(!!session)

        // Load family info
        const { data, error: fetchError } = await supabase
          .from('families')
          .select('*')
          .eq('invite_code', inviteCode)
          .single()

        if (fetchError || !data) {
          setError('Mã mời không hợp lệ hoặc đã hết hạn')
        } else {
          setFamily(data)
        }
      } catch (err) {
        setError('Có lỗi xảy ra khi tải thông tin')
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndLoadFamily()
  }, [inviteCode])

  const handleJoin = async () => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/join/${inviteCode}`)
      return
    }

    if (!family) return

    try {
      setJoining(true)

      const response = await fetch(`/api/families/${family.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inviteCode }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Không thể tham gia nhà')
      }

      toast.success('Tham gia nhà thành công!')
      router.push('/dashboard')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra'
      toast.error(errorMessage)
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (error || !family) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold">Không tìm thấy nhà</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => router.push('/dashboard')}>
            Về trang chủ
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="text-6xl mb-4">🏠</div>
          <h1 className="text-3xl font-bold">Lời mời tham gia nhà</h1>
          <p className="text-muted-foreground">
            Bạn được mời tham gia nhà gia đình
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-center">{family.name}</h2>
            <p className="text-sm text-muted-foreground text-center">
              Mã mời: {family.invite_code}
            </p>
          </div>

          <div className="pt-4">
            {!isAuthenticated ? (
              <div className="space-y-3">
                <p className="text-sm text-center text-muted-foreground">
                  Bạn cần đăng nhập để tham gia nhà
                </p>
                <Button 
                  onClick={handleJoin}
                  className="w-full h-12"
                >
                  Đăng nhập và tham gia
                </Button>
              </div>
            ) : (
              <Button 
                onClick={handleJoin}
                disabled={joining}
                className="w-full h-12"
              >
                {joining ? 'Đang tham gia...' : 'Tham gia nhà'}
              </Button>
            )}
          </div>
        </div>

        <div className="text-center">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/')}
          >
            Quay lại
          </Button>
        </div>
      </div>
    </div>
  )
}
