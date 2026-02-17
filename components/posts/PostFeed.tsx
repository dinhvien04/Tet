'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
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
  const supabase = createClient()

  const fetchPosts = useCallback(async () => {
    try {
      const response = await fetch(`/api/posts?familyId=${familyId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch posts')
      }

      const data = await response.json()
      setPosts(data)
      return data
    } catch (err) {
      console.error('Error fetching posts:', err)
      throw err
    }
  }, [familyId])

  // Initial load
  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true)
        setError(null)
        await fetchPosts()
      } catch (err) {
        setError('Không thể tải bài đăng. Vui lòng thử lại.')
      } finally {
        setLoading(false)
      }
    }
    
    loadPosts()
  }, [fetchPosts])

  // Setup realtime with fallback polling for posts
  const realtimeStatus = useRealtimeWithFallback({
    channelName: `family:${familyId}:posts`,
    table: 'posts',
    filter: `family_id=eq.${familyId}`,
    fetchData: fetchPosts,
    onInsert: async (payload) => {
      // Fetch the complete post with user info
      const { data: newPost } = await supabase
        .from('posts')
        .select(`
          *,
          users (
            id,
            name,
            avatar,
            email
          )
        `)
        .eq('id', payload.new.id)
        .single()

      if (newPost) {
        setPosts(prevPosts => [
          {
            ...newPost,
            reactions: { heart: 0, haha: 0 },
            userReaction: null
          },
          ...prevPosts
        ])
      }
    },
  })

  // Setup separate realtime subscription for reactions
  useEffect(() => {
    const channel = supabase
      .channel(`family:${familyId}:reactions`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reactions'
        },
        (payload: any) => {
          setPosts(prevPosts =>
            prevPosts.map(post => {
              if (post.id === payload.new.post_id) {
                const reactions = post.reactions ? { ...post.reactions } : { heart: 0, haha: 0 }
                const type = payload.new.type as 'heart' | 'haha'
                reactions[type] = (reactions[type] || 0) + 1
                
                return {
                  ...post,
                  reactions,
                  userReaction: payload.new.user_id === post.user_id ? type : post.userReaction
                }
              }
              return post
            })
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'reactions'
        },
        (payload: any) => {
          setPosts(prevPosts =>
            prevPosts.map(post => {
              if (post.id === payload.old.post_id) {
                const reactions = post.reactions ? { ...post.reactions } : { heart: 0, haha: 0 }
                const type = payload.old.type as 'heart' | 'haha'
                reactions[type] = Math.max(0, (reactions[type] || 0) - 1)
                
                return {
                  ...post,
                  reactions,
                  userReaction: payload.old.user_id === post.user_id ? null : post.userReaction
                }
              }
              return post
            })
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reactions'
        },
        (payload: any) => {
          setPosts(prevPosts =>
            prevPosts.map(post => {
              if (post.id === payload.new.post_id) {
                const reactions = post.reactions ? { ...post.reactions } : { heart: 0, haha: 0 }
                const oldType = payload.old.type as 'heart' | 'haha'
                const newType = payload.new.type as 'heart' | 'haha'
                
                reactions[oldType] = Math.max(0, (reactions[oldType] || 0) - 1)
                reactions[newType] = (reactions[newType] || 0) + 1
                
                return {
                  ...post,
                  reactions,
                  userReaction: payload.new.user_id === post.user_id ? newType : post.userReaction
                }
              }
              return post
            })
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [familyId, supabase])

  const handleReaction = async (postId: string, type: 'heart' | 'haha') => {
    try {
      const response = await fetch(`/api/posts/${postId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      })

      if (!response.ok) {
        throw new Error('Failed to add reaction')
      }

      const result = await response.json()

      // Update local state optimistically
      setPosts(prevPosts =>
        prevPosts.map(post => {
          if (post.id === postId) {
            const reactions = post.reactions ? { ...post.reactions } : { heart: 0, haha: 0 }
            
            if (result.action === 'removed') {
              reactions[type] = Math.max(0, (reactions[type] || 0) - 1)
              return {
                ...post,
                reactions,
                userReaction: null
              }
            } else if (result.action === 'updated') {
              const oldType = post.userReaction
              if (oldType) {
                reactions[oldType] = Math.max(0, (reactions[oldType] || 0) - 1)
              }
              reactions[type] = (reactions[type] || 0) + 1
              return {
                ...post,
                reactions,
                userReaction: type
              }
            } else {
              reactions[type] = (reactions[type] || 0) + 1
              return {
                ...post,
                reactions,
                userReaction: type
              }
            }
          }
          return post
        })
      )
    } catch (err) {
      console.error('Error adding reaction:', err)
      toast.error('Không thể thêm reaction. Vui lòng thử lại.')
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
        <button
          onClick={() => fetchPosts()}
          className="text-sm text-primary hover:underline"
        >
          Thử lại
        </button>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Chưa có bài đăng nào"
        description="Hãy tạo bài đăng đầu tiên để chia sẻ với gia đình!"
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
      
      {posts.map(post => (
        <PostCard key={post.id} post={post} onReaction={handleReaction} />
      ))}
    </div>
  )
}
