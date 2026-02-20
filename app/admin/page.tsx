'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout'
import { useAuth } from '@/lib/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, RefreshCcw, Shield, Users, Calendar, Image as ImageIcon, FileText } from 'lucide-react'

interface AdminStats {
  users_count: number
  admins_count: number
  families_count: number
  posts_count: number
  events_count: number
  photos_count: number
}

interface ManagedUser {
  id: string
  name: string
  email: string
  avatar?: string | null
  provider: 'credentials' | 'google'
  role: 'user' | 'admin'
  created_at: string
}

const DEFAULT_STATS: AdminStats = {
  users_count: 0,
  admins_count: 0,
  families_count: 0,
  posts_count: 0,
  events_count: 0,
  photos_count: 0,
}

export default function AdminPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [stats, setStats] = useState<AdminStats>(DEFAULT_STATS)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionUserId, setActionUserId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchAdminData = useCallback(async () => {
    try {
      setIsLoading(true)
      setErrorMessage(null)

      const response = await fetch('/api/admin/users')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Khong the tai du lieu admin')
      }

      setStats(data.stats || DEFAULT_STATS)
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching admin data:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Khong the tai du lieu admin')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return

    if (!user) return

    if (user.role !== 'admin') {
      router.replace('/dashboard')
      return
    }

    fetchAdminData()
  }, [authLoading, user, router, fetchAdminData])

  const handleRoleChange = async (target: ManagedUser, nextRole: 'user' | 'admin') => {
    try {
      setActionUserId(target.id)
      setErrorMessage(null)

      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: target.id,
          role: nextRole,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Khong the cap nhat role')
      }

      setUsers((prev) =>
        prev.map((item) => (item.id === target.id ? { ...item, role: nextRole } : item))
      )
      setStats((prev) => ({
        ...prev,
        admins_count: nextRole === 'admin' ? prev.admins_count + 1 : prev.admins_count - 1,
      }))
    } catch (error) {
      console.error('Error updating role:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Khong the cap nhat role')
    } finally {
      setActionUserId(null)
    }
  }

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) {
      return users
    }

    return users.filter(
      (item) => item.name.toLowerCase().includes(q) || item.email.toLowerCase().includes(q)
    )
  }, [users, searchTerm])

  if (authLoading || (user?.role === 'admin' && isLoading)) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="min-h-[50vh] flex items-center justify-center">
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              Dang tai admin dashboard...
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-red-600">System Admin</h1>
              <p className="text-gray-600">Quan ly user va thong ke toan bo website</p>
            </div>
            <Button variant="outline" onClick={fetchAdminData} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCcw className="w-4 h-4 mr-2" />
              )}
              Lam moi
            </Button>
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-gray-600">Users</div>
                <div className="text-xl font-semibold">{stats.users_count}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-gray-600">Admins</div>
                <div className="text-xl font-semibold">{stats.admins_count}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-gray-600">Families</div>
                <div className="text-xl font-semibold">{stats.families_count}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-gray-600">Posts</div>
                <div className="text-xl font-semibold">{stats.posts_count}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-gray-600">Events</div>
                <div className="text-xl font-semibold">{stats.events_count}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-gray-600">Photos</div>
                <div className="text-xl font-semibold">{stats.photos_count}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Tim theo ten hoac email..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />

              <div className="space-y-2">
                {filteredUsers.map((item) => {
                  const isMe = item.id === user.id
                  const isBusy = actionUserId === item.id
                  const createdAt = new Date(item.created_at).toLocaleDateString()

                  return (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 border rounded-lg p-3 md:flex-row md:items-center"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar>
                          <AvatarImage src={item.avatar || undefined} alt={item.name} />
                          <AvatarFallback>{item.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-sm text-gray-600 truncate">{item.email}</p>
                          <div className="text-xs text-gray-500">
                            Provider: {item.provider} | Created: {createdAt}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            item.role === 'admin'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {item.role === 'admin' ? 'ADMIN' : 'USER'}
                        </span>

                        {isMe && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                            You
                          </span>
                        )}

                        {item.role === 'admin' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy || isMe}
                            onClick={() => handleRoleChange(item, 'user')}
                          >
                            {isBusy ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Shield className="w-4 h-4 mr-1" />
                            )}
                            Demote
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() => handleRoleChange(item, 'admin')}
                          >
                            {isBusy ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Shield className="w-4 h-4 mr-1" />
                            )}
                            Promote
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}

                {filteredUsers.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    Khong co user phu hop bo loc.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <div className="text-sm text-gray-700">Posts moderation via role control</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Calendar className="w-5 h-5 text-green-600" />
                <div className="text-sm text-gray-700">Events visibility from global stats</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <ImageIcon className="w-5 h-5 text-purple-600" />
                <div className="text-sm text-gray-700">Photos growth tracking</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
