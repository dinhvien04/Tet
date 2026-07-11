import useSWR from 'swr'
import type { Photo } from '@/types/photo'

export type { Photo }

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

      // Revalidate on focus for fresher data when user returns
      revalidateOnFocus: true,

      // Dedupe requests within 5 seconds
      dedupingInterval: 5000,
    }
  )

  return {
    photos: data ?? [],
    isLoading,
    isError: error,
    mutate,
  }
}
