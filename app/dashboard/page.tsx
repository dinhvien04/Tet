'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { useFamily } from '@/components/family/FamilyContext'
import { useDashboardSummary } from '@/lib/hooks/useDashboardSummary'
import {
  Plus,
  FileText,
  Calendar,
  Image as ImageIcon,
  Sparkles,
  CheckSquare,
  Bell,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import Image from 'next/image'

export default function DashboardPage() {
  const router = useRouter()
  const { currentFamily } = useFamily()
  const { summary, isLoading: summaryLoading } = useDashboardSummary(
    currentFamily?.id || ''
  )

  const recentPosts = summary?.recentPosts || []
  const upcomingEvents = summary?.upcomingEvents || []
  const recentPhotos = summary?.recentPhotos || []

  if (!currentFamily) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="mx-auto max-w-4xl">
            <div className="rounded-lg border border-border bg-card p-4 text-center shadow-sm md:p-6">
              <p className="mb-4 text-muted-foreground">
                Bạn chưa thuộc nhà nào. Hãy tạo nhà mới hoặc tham gia nhà hiện có.
              </p>
              <Button onClick={() => router.push('/family/create')}>Tạo nhà mới</Button>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto max-w-7xl space-y-6">
          <div>
            <h1 className="mb-2 text-2xl font-bold text-primary md:text-3xl">Dashboard</h1>
            <p className="text-muted-foreground">Chào mừng đến với {currentFamily.name}</p>
          </div>

          {/* Counters from summary */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <CheckSquare className="h-5 w-5 text-primary" aria-hidden />
                <div>
                  <p className="text-2xl font-bold">
                    {summaryLoading ? '…' : summary?.pendingTaskCount ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Việc chưa xong</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <Bell className="h-5 w-5 text-primary" aria-hidden />
                <div>
                  <p className="text-2xl font-bold">
                    {summaryLoading ? '…' : summary?.unreadNotificationCount ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Thông báo chưa đọc</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Thao tác nhanh
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => router.push('/ai/generate')}
                >
                  <Sparkles className="h-6 w-6 text-secondary-foreground" />
                  <span className="text-sm">Tạo câu đối AI</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => router.push('/posts/create')}
                >
                  <FileText className="h-6 w-6" />
                  <span className="text-sm">Tạo bài đăng</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => router.push('/events/create')}
                >
                  <Calendar className="h-6 w-6" />
                  <span className="text-sm">Tạo sự kiện</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => router.push('/photos')}
                >
                  <ImageIcon className="h-6 w-6" />
                  <span className="text-sm">Upload ảnh</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Bài đăng gần đây</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => router.push('/posts')}>
                  Xem tất cả
                </Button>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : recentPosts.length > 0 ? (
                  <ul className="space-y-3">
                    {recentPosts.map((post) => (
                      <li
                        key={post.id}
                        className="rounded-lg border border-border p-3"
                      >
                        <p className="text-xs text-muted-foreground">
                          {post.author?.name || 'Thành viên'} · {post.type}
                        </p>
                        <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm">
                          {post.content}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-8 text-center text-muted-foreground">
                    Chưa có bài đăng nào
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Sự kiện sắp tới</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => router.push('/events')}>
                  Xem tất cả
                </Button>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : upcomingEvents.length > 0 ? (
                  <ul className="space-y-3">
                    {upcomingEvents.map((event) => (
                      <li key={event.id}>
                        <button
                          type="button"
                          className="w-full rounded-lg border border-border p-3 text-left hover:bg-muted/50"
                          onClick={() => router.push(`/events/${event.id}`)}
                        >
                          <p className="font-medium">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(event.date).toLocaleString('vi-VN')}
                            {event.location ? ` · ${event.location}` : ''}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-8 text-center text-muted-foreground">
                    Chưa có sự kiện nào
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Ảnh gần đây</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push('/photos')}>
                Xem tất cả
              </Button>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="aspect-square rounded-lg" />
                  ))}
                </div>
              ) : recentPhotos.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
                  {recentPhotos.map((photo) => (
                    <button
                      type="button"
                      key={photo.id}
                      className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
                      onClick={() => router.push(`/photos?photoId=${photo.id}`)}
                    >
                      <Image
                        src={photo.url}
                        alt="Ảnh gia đình"
                        fill
                        sizes="(max-width: 640px) 50vw, 16vw"
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">Chưa có ảnh nào</p>
              )}
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
