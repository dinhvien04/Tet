'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { PostCard, Post } from './PostCard'
import { Loader2 } from 'lucide-react'
import { PostCardSkeleton } from '@/components/skeletons/PostCardSkeleton'

interface PostFeedInfiniteProps {
  familyId: string
  pageSize?: number
}

export function PostFeedInfinite({ familyId, pageSize = 10 }: PostFeedInfiniteProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const supabase = createClient()
  const observerTarget = useRef<HTMLDivElement>(null)

  // Fetch posts with pagination
  const fetchPosts = useCallback(async (pageNum: number, append = false) => {
    try {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const from = pageNum * pageSize
      const to = from + pageSize - 1

      const response = await fetch(
        `/api/posts?familyId=${familyId}&from=${from}&to=${to}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch posts')
      }

      const data = await response.json()
      
      if (append) {
        setPosts(prev => [...prev, ...data])
      } else {
        setPosts(data)
      }

      // Check if there are more posts
      setHasMore(data.length === pageSize)
    } catch (err) {
      console.error('Error fetching posts:', err)
      setError('Không thể tải bài đăng. Vui lòng thử lại.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [familyId, pageSize])

  // Initial load
  useEffect(() => {
    fetchPosts(0)
  }, [fetchPosts])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          const nextPage = page + 1
          setPage(nextPage)
          fetchPosts(nextPage, true)
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, loadingMore, loading, page, fetchPosts])

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`family:${familyId}:posts`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `family_id=eq.${familyId}`
        },
        async (payload) => {
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
        }
      )
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
          onClick={() => fetchPosts(0)}
          className="text-sm text-primary hover:underline"
        >
          Thử lại
        </button>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Chưa có bài đăng nào. Hãy tạo bài đăng đầu tiên!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map(post => (
        <PostCard key={post.id} post={post} onReaction={handleReaction} />
      ))}
      
      {/* Infinite scroll trigger */}
      {hasMore && (
        <div ref={observerTarget} className="flex items-center justify-center py-8">
          {loadingMore && (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          )}
        </div>
      )}
      
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            Đã hiển thị tất cả bài đăng
          </p>
        </div>
      )}
    </div>
  )
}
