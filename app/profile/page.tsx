'use client'

import { useEffect, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface ProfileUser {
  id: string
  email: string
  name: string
  avatar: string | null
  role: string
  provider: string
  canChangePassword?: boolean
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<ProfileUser | null>(null)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/profile')
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Không tải được hồ sơ')
        setUser(data.user)
        setName(data.user.name || '')
        setAvatar(data.user.avatar || '')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Lỗi tải hồ sơ')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          avatar: avatar.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Không lưu được')
      setUser((u) => (u ? { ...u, ...data.user } : data.user))
      toast.success('Đã cập nhật hồ sơ')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Không đổi được mật khẩu')
      setCurrentPassword('')
      setNewPassword('')
      toast.success('Đã đổi mật khẩu')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto max-w-xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-primary md:text-3xl">Hồ sơ cá nhân</h1>
            <p className="text-muted-foreground">Cập nhật tên, ảnh đại diện và mật khẩu</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Thông tin</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div>
                      <Label>Email</Label>
                      <Input value={user?.email || ''} disabled />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Đăng nhập bằng: {user?.provider === 'google' ? 'Google' : 'Email/mật khẩu'}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="name">Tên hiển thị</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={100}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="avatar">URL ảnh đại diện</Label>
                      <Input
                        id="avatar"
                        value={avatar}
                        onChange={(e) => setAvatar(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <Button type="submit" disabled={saving}>
                      {saving ? 'Đang lưu...' : 'Lưu hồ sơ'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {user?.canChangePassword && (
                <Card>
                  <CardHeader>
                    <CardTitle>Đổi mật khẩu</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div>
                        <Label htmlFor="current">Mật khẩu hiện tại</Label>
                        <Input
                          id="current"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="next">Mật khẩu mới</Label>
                        <Input
                          id="next"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={8}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Ít nhất 8 ký tự, có chữ hoa, chữ thường và số
                        </p>
                      </div>
                      <Button type="submit" disabled={saving} variant="outline">
                        Đổi mật khẩu
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
