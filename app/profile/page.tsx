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
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [eventReminders, setEventReminders] = useState(true)
  const [taskReminders, setTaskReminders] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/profile')
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Không tải được hồ sơ')
        setUser(data.user)
        setName(data.user.name || '')
        setAvatar(data.user.avatar || '')

        const prefRes = await fetch('/api/profile/preferences')
        if (prefRes.ok) {
          const pref = await prefRes.json()
          setEventReminders(pref.preferences?.eventReminders ?? true)
          setTaskReminders(pref.preferences?.taskReminders ?? true)
        }
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

  const handleDeleteAccount = async () => {
    if (deleteConfirm.trim().toUpperCase() !== 'XOA TAI KHOAN') {
      toast.error('Gõ đúng XOA TAI KHOAN để xác nhận')
      return
    }
    if (!window.confirm('Bạn chắc chắn muốn xóa tài khoản? Không hoàn tác được.')) {
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'XOA TAI KHOAN' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Không xóa được')
      toast.success('Đã xóa tài khoản')
      window.location.href = '/login'
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

              <Card>
                <CardHeader>
                  <CardTitle>Thông báo & dữ liệu</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={eventReminders}
                      onChange={(e) => setEventReminders(e.target.checked)}
                      className="h-4 w-4"
                    />
                    Nhắc sự kiện sắp tới
                  </label>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={taskReminders}
                      onChange={(e) => setTaskReminders(e.target.checked)}
                      className="h-4 w-4"
                    />
                    Nhắc công việc chưa xong
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={async () => {
                      setSaving(true)
                      try {
                        const res = await fetch('/api/profile/preferences', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ eventReminders, taskReminders }),
                        })
                        const data = await res.json()
                        if (!res.ok) throw new Error(data.error)
                        toast.success('Đã lưu tùy chọn thông báo')
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Lỗi')
                      } finally {
                        setSaving(false)
                      }
                    }}
                  >
                    Lưu tùy chọn
                  </Button>
                  <div className="border-t border-border pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        window.location.href = '/api/profile/export'
                      }}
                    >
                      Tải xuất dữ liệu (JSON)
                    </Button>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Tải bài đăng, comment, ảnh, RSVP và thông tin cơ bản (không có mật khẩu).
                    </p>
                  </div>
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

              <Card className="border-destructive/40">
                <CardHeader>
                  <CardTitle className="text-destructive">Xóa tài khoản</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Thao tác không hoàn tác. Bạn phải không còn là admin cuối của bất kỳ nhà nào.
                    Gõ <strong>XOA TAI KHOAN</strong> để xác nhận.
                  </p>
                  <Input
                    id="delete-confirm"
                    placeholder="XOA TAI KHOAN"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={saving || deleteConfirm.trim().toUpperCase() !== 'XOA TAI KHOAN'}
                    onClick={handleDeleteAccount}
                  >
                    Xóa vĩnh viễn tài khoản
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
