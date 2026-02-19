import useSWR from 'swr'

export interface Photo {
  id: string
  family_id: string
  user_id: string
  url: string
  uploaded_at: string
  users?: {
    id: string
    name: string
    email: string
    avatar: string | null
  }
}

// Fetcher function that handles the API response format
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch photos')
  const data = await res.json()
  // API might return { photos: [...] } or just [...]
  return Array.isArray(data) ? data : (data.photos || [])
}

/**
 * Custom hook for fetching and caching photos with SWR
 * Implements automatic revalidation and caching strategies
 */
export function usePhotos(familyId: string) {
  const { data, error, isLoading, mutate } = useSWR<Photo[]>(
    familyId ? `/api/photos?familyId=${familyId}` : null,
    fetcher,
    {
      // Photos don't change as frequently, so longer refresh interval
      refreshInterval: 60000, // 1 minute
      
      // Keep previous data while fetching new data
      keepPreviousData: true,
      
      // Don't revalidate on focus to prevent logout
      revalidateOnFocus: false,
      
      // Dedupe requests within 5 seconds
      dedupingInterval: 5000,
    }
  )

  return {
    photos: data || [], // Always return array
    isLoading,
    isError: error,
    mutate,
  }
}

/**
 * Optimistically update photos cache
 */
export function useOptimisticPhoto() {
  return {
    addPhoto: (familyId: string, newPhoto: Photo, mutate: any) => {
      mutate(
        `/api/photos?familyId=${familyId}`,
        async (currentPhotos: Photo[] = []) => {
          // Optimistically add the new photo at the beginning
          return [newPhoto, ...currentPhotos]
        },
        {
          // Revalidate after optimistic update to ensure consistency
          revalidate: true,
        }
      )
    },
  }
}
