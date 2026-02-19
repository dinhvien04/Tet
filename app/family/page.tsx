'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useFamily } from '@/components/family/FamilyContext'
import { useRouter } from 'next/navigation'
import { Users, UserPlus, Copy, Check } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface FamilyMember {
  id: string
  user_id: string
  name: string
  email: string
  avatar?: string
  role: string
  joined_at: string
}

export default function FamilyPage() {
  const router = useRouter()
  const { currentFamily } = useFamily()
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const fetchMembers = useCallback(async () => {
    if (!currentFamily?.id) return
    try {
      setIsLoading(true)
      const res = await fetch(`/api/families/${currentFamily?.id}/members`)
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members || [])
      }
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentFamily?.id])

  useEffect(() => {
    if (currentFamily?.id) {
      fetchMembers()
    }
  }, [currentFamily?.id, fetchMembers])

  const copyInviteLink = () => {
    if (currentFamily?.invite_code) {
      const inviteUrl = `${window.location.origin}/join/${currentFamily.invite_code}`
      navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!currentFamily) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h2 className="text-xl font-semibold mb-2">Chưa có gia đình</h2>
                <p className="text-gray-600 mb-4">
                  Bạn chưa thuộc nhà nào. Hãy tạo nhà mới hoặc tham gia nhà hiện có.
                </p>
                <Button 
                  onClick={() => router.push('/family/create')}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Tạo nhà mới
                </Button>
              </CardContent>
            </Card>
          </div>
        </AppLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-red-600 mb-2">
              Gia đình
            </h1>
            <p className="text-gray-600">
              Quản lý thông tin và thành viên gia đình
            </p>
          </div>

          {/* Family Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Thông tin gia đình
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Tên gia đình</label>
                <p className="text-lg font-semibold">{currentFamily.name}</p>
              </div>

              {currentFamily.invite_code && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Mã mời</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 px-3 py-2 bg-gray-100 rounded-lg font-mono text-sm">
                      {currentFamily.invite_code}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyInviteLink}
                      className="gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Đã copy
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy link
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Chia sẻ link này để mời người khác tham gia gia đình
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Members List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Thành viên ({members.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg animate-pulse">
                      <div className="w-10 h-10 bg-gray-200 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : members.length > 0 ? (
                <div className="space-y-3">
                  {members.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Avatar>
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback>
                          {member.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-gray-600">{member.email}</p>
                      </div>
                      {member.role === 'admin' && (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
                          Quản trị viên
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  Chưa có thành viên nào
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
