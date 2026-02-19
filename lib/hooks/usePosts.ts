import useSWR from 'swr'
import { Post } from '@/components/posts/PostCard'

// Fetcher function that handles the API response format
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch posts')
  const data = await res.json()
  // API might return { posts: [...] } or just [...]
  return Array.isArray(data) ? data : (data.posts || [])
}

/**
 * Custom hook for fetching and caching posts with SWR
 * Implements automatic revalidation and caching strategies
 */
export function usePosts(familyId: string) {
  const { data, error, isLoading, mutate } = useSWR<Post[]>(
    familyId ? `/api/posts?familyId=${familyId}` : null,
    fetcher,
    {
      // Revalidate every 30 seconds when tab is focused
      refreshInterval: 30000,
      
      // Keep previous data while fetching new data
      keepPreviousData: true,
      
      // Don't revalidate on focus to prevent logout
      revalidateOnFocus: false,
      
      // Dedupe requests within 2 seconds
      dedupingInterval: 2000,
    }
  )

  return {
    posts: data || [], // Always return array
    isLoading,
    isError: error,
    mutate,
  }
}

/**
 * Optimistically update posts cache
 */
export function useOptimisticPost() {
  return {
    addPost: (familyId: string, newPost: Post, mutate: any) => {
      mutate(
        `/api/posts?familyId=${familyId}`,
        async (currentPosts: Post[] = []) => {
          // Optimistically add the new post
          return [newPost, ...currentPosts]
        },
        {
          // Don't revalidate immediately
          revalidate: false,
        }
      )
    },
    
    updateReaction: (
      familyId: string,
      postId: string,
      type: 'heart' | 'haha',
      action: 'added' | 'removed' | 'updated',
      oldType: 'heart' | 'haha' | null,
      mutate: any
    ) => {
      mutate(
        `/api/posts?familyId=${familyId}`,
        async (currentPosts: Post[] = []) => {
          return currentPosts.map(post => {
            if (post.id === postId) {
              const reactions = post.reactions ? { ...post.reactions } : { heart: 0, haha: 0 }
              
              if (action === 'removed') {
                reactions[type] = Math.max(0, (reactions[type] || 0) - 1)
                return { ...post, reactions, userReaction: null }
              } else if (action === 'updated' && oldType) {
                reactions[oldType] = Math.max(0, (reactions[oldType] || 0) - 1)
                reactions[type] = (reactions[type] || 0) + 1
                return { ...post, reactions, userReaction: type }
              } else {
                reactions[type] = (reactions[type] || 0) + 1
                return { ...post, reactions, userReaction: type }
              }
            }
            return post
          })
        },
        {
          // Don't revalidate immediately for better UX
          revalidate: false,
        }
      )
    },
  }
}
