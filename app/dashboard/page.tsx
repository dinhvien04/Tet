'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { useFamily } from '@/components/family/FamilyContext'
import { usePosts } from '@/lib/hooks/usePosts'
import { useEvents } from '@/lib/hooks/useEvents'
import { usePhotos, Photo } from '@/lib/hooks/usePhotos'
import { PostCard } from '@/components/posts/PostCard'
import { EventCard } from '@/components/events/EventCard'
import { Plus, FileText, Calendar, Image as ImageIcon, Sparkles } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import Image from 'next/image'

export default function DashboardPage() {
  const router = useRouter()
  const { currentFamily } = useFamily()
  const { posts, isLoading: postsLoading } = usePosts(currentFamily?.id || '')
  const { events, isLoading: eventsLoading } = useEvents(currentFamily?.id || '')
  const { photos, isLoading: photosLoading } = usePhotos(currentFamily?.id || '')

  // Get recent posts (last 3)
  const recentPosts = posts?.slice(0, 3) || []

  // Get upcoming events (next 3)
  const upcomingEvents = events
    ?.filter(event => new Date(event.date) > new Date())
    ?.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    ?.slice(0, 3) || []

  // Get recent photos (last 6)
  const recentPhotos = photos?.slice(0, 6) || []

  const handleReaction = async (postId: string, type: 'heart' | 'haha') => {
    try {
      await fetch(`/api/posts/${postId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
    } catch (err) {
      console.error('Error adding reaction:', err)
    }
  }

  if (!currentFamily) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 text-center">
              <p className="text-gray-600 mb-4">
                Bạn chưa thuộc nhà nào. Hãy tạo nhà mới hoặc tham gia nhà hiện có.
              </p>
              <Button 
                onClick={() => router.push('/family/create')}
                className="bg-red-600 hover:bg-red-700"
              >
                Tạo nhà mới
              </Button>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-red-600 mb-2">
              Dashboard
            </h1>
            <p className="text-gray-600">
              Chào mừng đến với {currentFamily.name}
            </p>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Thao tác nhanh
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => router.push('/ai/generate')}
                >
                  <Sparkles className="w-6 h-6 text-yellow-500" />
                  <span className="text-sm">Tạo câu đối AI</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => router.push('/posts/create')}
                >
                  <FileText className="w-6 h-6 text-blue-500" />
                  <span className="text-sm">Tạo bài đăng</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => router.push('/events/create')}
                >
                  <Calendar className="w-6 h-6 text-green-500" />
                  <span className="text-sm">Tạo sự kiện</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => router.push('/photos')}
                >
                  <ImageIcon className="w-6 h-6 text-purple-500" />
                  <span className="text-sm">Upload ảnh</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Posts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Bài đăng gần đây</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/posts')}
                >
                  Xem tất cả
                </Button>
              </CardHeader>
              <CardContent>
                {postsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ))}
                  </div>
                ) : recentPosts.length > 0 ? (
                  <div className="space-y-4">
                    {recentPosts.map(post => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onReaction={handleReaction}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    Chưa có bài đăng nào
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Sự kiện sắp tới</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/events')}
                >
                  Xem tất cả
                </Button>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : upcomingEvents.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingEvents.map(event => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    Chưa có sự kiện nào
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Photos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Ảnh gần đây</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/photos')}
              >
                Xem tất cả
              </Button>
            </CardHeader>
            <CardContent>
              {photosLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <Skeleton key={i} className="aspect-square rounded-lg" />
                  ))}
                </div>
              ) : recentPhotos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {recentPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer group"
                      onClick={() => router.push(`/photos?photoId=${photo.id}`)}
                    >
                      <Image
                        src={photo.url}
                        alt={`Photo by ${photo.users?.name || 'Unknown'}`}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 16vw"
                        className="object-cover transition-all duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  Chưa có ảnh nào
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
