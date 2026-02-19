'use client'

import { useEffect, useState, useCallback } from 'react'
import { PostCard, Post } from './PostCard'
import { PostCardSkeleton } from '@/components/skeletons/PostCardSkeleton'
import { toast } from 'sonner'
import { useRealtimeWithFallback } from '@/lib/hooks/useRealtimeWithFallback'
import { RealtimeStatusIndicator } from '@/components/ui/offline-indicator'
import { EmptyState } from '@/components/ui/empty-state'
import { MessageSquare } from 'lucide-react'

interface PostFeedProps {
  familyId: string
}

export function PostFeed({ familyId }: PostFeedProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    const response = await fetch(`/api/posts?familyId=${familyId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch posts')
    }

    const data = await response.json()
    const postList = Array.isArray(data) ? data : data.posts || []
    setPosts(postList)
    return postList
  }, [familyId])

  useEffect(() => {
    async function loadPosts() {
      try {
        setLoading(true)
        setError(null)
        await fetchPosts()
      } catch {
        setError('Khong the tai bai dang. Vui long thu lai.')
      } finally {
        setLoading(false)
      }
    }

    void loadPosts()
  }, [fetchPosts])

  const realtimeStatus = useRealtimeWithFallback({
    channelName: `family:${familyId}:posts`,
    table: 'posts',
    filter: `family_id=eq.${familyId}`,
    fetchData: fetchPosts,
  })

  const handleReaction = async (postId: string, type: 'heart' | 'haha') => {
    try {
      const response = await fetch(`/api/posts/${postId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })

      if (!response.ok) {
        throw new Error('Failed to add reaction')
      }

      const result = await response.json()

      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id !== postId) return post

          const reactions = post.reactions
            ? { ...post.reactions }
            : { heart: 0, haha: 0 }

          if (result.action === 'removed') {
            reactions[type] = Math.max(0, (reactions[type] || 0) - 1)
            return { ...post, reactions, userReaction: null }
          }

          if (result.action === 'updated') {
            const oldType = post.userReaction
            if (oldType) {
              reactions[oldType] = Math.max(0, (reactions[oldType] || 0) - 1)
            }
            reactions[type] = (reactions[type] || 0) + 1
            return { ...post, reactions, userReaction: type }
          }

          reactions[type] = (reactions[type] || 0) + 1
          return { ...post, reactions, userReaction: type }
        })
      )
    } catch (err) {
      console.error('Error adding reaction:', err)
      toast.error('Khong the them reaction. Vui long thu lai.')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <button onClick={() => void fetchPosts()} className="text-sm text-primary hover:underline">
          Thu lai
        </button>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Chua co bai dang nao"
        description="Hay tao bai dang dau tien de chia se voi gia dinh!"
      />
    )
  }

  return (
    <div className="space-y-4">
      {realtimeStatus.isPolling && (
        <RealtimeStatusIndicator
          isConnected={realtimeStatus.isConnected}
          isPolling={realtimeStatus.isPolling}
        />
      )}

      {posts.map((post) => (
        <PostCard key={post.id} post={post} onReaction={handleReaction} />
      ))}
    </div>
  )
}
