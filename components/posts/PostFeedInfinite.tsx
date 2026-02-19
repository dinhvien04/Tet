'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
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
  const observerTarget = useRef<HTMLDivElement>(null)

  const fetchPosts = useCallback(
    async (pageNum: number, append = false) => {
      try {
        if (append) {
          setLoadingMore(true)
        } else {
          setLoading(true)
        }
        setError(null)

        const from = pageNum * pageSize
        const to = from + pageSize - 1

        const response = await fetch(`/api/posts?familyId=${familyId}&from=${from}&to=${to}`)
        if (!response.ok) {
          throw new Error('Failed to fetch posts')
        }

        const data = await response.json()
        const postList = Array.isArray(data) ? data : data.posts || []

        if (append) {
          setPosts((prev) => [...prev, ...postList])
        } else {
          setPosts(postList)
        }

        setHasMore(postList.length === pageSize)
      } catch (err) {
        console.error('Error fetching posts:', err)
        setError('Khong the tai bai dang. Vui long thu lai.')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [familyId, pageSize]
  )

  useEffect(() => {
    void fetchPosts(0)
  }, [fetchPosts])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          const nextPage = page + 1
          setPage(nextPage)
          void fetchPosts(nextPage, true)
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) observer.observe(currentTarget)

    return () => {
      if (currentTarget) observer.unobserve(currentTarget)
    }
  }, [hasMore, loadingMore, loading, page, fetchPosts])

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

          const reactions = post.reactions ? { ...post.reactions } : { heart: 0, haha: 0 }

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
        <button onClick={() => void fetchPosts(0)} className="text-sm text-primary hover:underline">
          Thu lai
        </button>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Chua co bai dang nao. Hay tao bai dang dau tien!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onReaction={handleReaction} />
      ))}

      {hasMore && (
        <div ref={observerTarget} className="flex items-center justify-center py-8">
          {loadingMore && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">Da hien thi tat ca bai dang</p>
        </div>
      )}
    </div>
  )
}
