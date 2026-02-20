'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useFamily } from '@/components/family/FamilyContext'
import { useRouter } from 'next/navigation'
import { Users, UserPlus, Copy, Check, ShieldCheck, ShieldOff, Trash2, Loader2 } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/lib/hooks/useAuth'

interface FamilyMember {
  id: string
  user_id: string
  name: string
  email: string
  avatar?: string
  role: 'admin' | 'member'
  joined_at: string
}

export default function FamilyPage() {
  const router = useRouter()
  const { currentFamily } = useFamily()
  const { user } = useAuth()
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    if (!currentFamily?.id) return

    try {
      setIsLoading(true)
      const res = await fetch(`/api/families/${currentFamily.id}/members`)
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

  const myMembership = members.find((member) => member.user_id === user?.id)
  const isCurrentUserAdmin = myMembership?.role === 'admin'

  const updateMemberRole = async (memberId: string, role: 'admin' | 'member') => {
    if (!currentFamily?.id) return

    try {
      setActionLoadingId(memberId)
      const response = await fetch(`/api/families/${currentFamily.id}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Khong the cap nhat quyen')
      }

      await fetchMembers()
    } catch (error) {
      console.error('Error updating member role:', error)
      alert(error instanceof Error ? error.message : 'Khong the cap nhat quyen')
    } finally {
      setActionLoadingId(null)
    }
  }

  const removeMember = async (member: FamilyMember) => {
    if (!currentFamily?.id) return

    const shouldDelete = window.confirm(`Xoa ${member.name} khoi gia dinh?`)
    if (!shouldDelete) return

    try {
      setActionLoadingId(member.id)
      const response = await fetch(
        `/api/families/${currentFamily.id}/members?memberId=${encodeURIComponent(member.id)}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Khong the xoa thanh vien')
      }

      await fetchMembers()
    } catch (error) {
      console.error('Error removing member:', error)
      alert(error instanceof Error ? error.message : 'Khong the xoa thanh vien')
    } finally {
      setActionLoadingId(null)
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
                <h2 className="text-xl font-semibold mb-2">Chua co gia dinh</h2>
                <p className="text-gray-600 mb-4">
                  Ban chua thuoc nha nao. Hay tao nha moi hoac tham gia nha hien co.
                </p>
                <Button
                  onClick={() => router.push('/family/create')}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Tao nha moi
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
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-red-600 mb-2">Gia dinh</h1>
            <p className="text-gray-600">Quan ly thong tin va thanh vien gia dinh</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Thong tin gia dinh
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Ten gia dinh</label>
                <p className="text-lg font-semibold">{currentFamily.name}</p>
              </div>

              {currentFamily.invite_code && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Ma moi</label>
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
                          Da copy
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
                    Chia se link nay de moi nguoi khac tham gia gia dinh
                  </p>
                </div>
              )}

              <div className="rounded-lg border bg-gray-50 p-3 text-sm text-gray-700">
                {isCurrentUserAdmin
                  ? 'Ban dang la admin cua gia dinh. Ban co the cap quyen, ha quyen, va xoa thanh vien.'
                  : 'Ban dang la thanh vien. Chi admin moi co the quan ly thanh vien.'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Thanh vien ({members.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
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
                  {members.map((member) => {
                    const isMe = member.user_id === user?.id
                    const isBusy = actionLoadingId === member.id

                    return (
                      <div
                        key={member.id}
                        className="flex flex-col gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors md:flex-row md:items-center"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar>
                            <AvatarImage src={member.avatar} alt={member.name} />
                            <AvatarFallback>{member.name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>

                          <div className="min-w-0">
                            <p className="font-medium truncate">{member.name}</p>
                            <p className="text-sm text-gray-600 truncate">{member.email}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {member.role === 'admin' ? (
                            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
                              Admin
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                              Thanh vien
                            </span>
                          )}

                          {isMe && (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                              Ban
                            </span>
                          )}

                          {isCurrentUserAdmin && !isMe && (
                            <>
                              {member.role === 'member' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1"
                                  disabled={isBusy}
                                  onClick={() => updateMemberRole(member.id, 'admin')}
                                >
                                  {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                                  Cap admin
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1"
                                  disabled={isBusy}
                                  onClick={() => updateMemberRole(member.id, 'member')}
                                >
                                  {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldOff className="w-3 h-3" />}
                                  Ha quyen
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                                disabled={isBusy}
                                onClick={() => removeMember(member)}
                              >
                                {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                Xoa
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">Chua co thanh vien nao</p>
              )}
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
