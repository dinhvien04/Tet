import useSWR from 'swr'
import { Event } from '@/types/database'

// Fetcher function that handles the API response format
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch events')
  const data = await res.json()
  return data.events || [] // API returns { events: [...] }
}

/**
 * Custom hook for fetching and caching events with SWR
 * Implements automatic revalidation and caching strategies
 */
export function useEvents(familyId: string) {
  const { data, error, isLoading, mutate } = useSWR<Event[]>(
    familyId ? `/api/events?familyId=${familyId}` : null,
    fetcher,
    {
      // Events change moderately, refresh every 45 seconds
      refreshInterval: 45000,
      
      // Keep previous data while fetching new data
      keepPreviousData: true,
      
      // Don't revalidate on focus to prevent logout
      revalidateOnFocus: false,
      
      // Dedupe requests within 3 seconds
      dedupingInterval: 3000,
    }
  )

  return {
    events: data || [], // Always return array
    isLoading,
    isError: error,
    mutate,
  }
}

/**
 * Optimistically update events cache
 */
export function useOptimisticEvent() {
  return {
    addEvent: (familyId: string, newEvent: Event, mutate: any) => {
      mutate(
        `/api/events?familyId=${familyId}`,
        async (currentEvents: Event[] = []) => {
          // Optimistically add the new event
          return [...currentEvents, newEvent]
        },
        {
          // Revalidate to get server-side data
          revalidate: true,
        }
      )
    },
  }
}
