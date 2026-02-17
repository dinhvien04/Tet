import useSWR from 'swr'
import { Event } from '@/types/database'

/**
 * Custom hook for fetching and caching events with SWR
 * Implements automatic revalidation and caching strategies
 */
export function useEvents(familyId: string) {
  const { data, error, isLoading, mutate } = useSWR<Event[]>(
    familyId ? `/api/events?familyId=${familyId}` : null,
    {
      // Events change moderately, refresh every 45 seconds
      refreshInterval: 45000,
      
      // Keep previous data while fetching new data
      keepPreviousData: true,
      
      // Revalidate on focus
      revalidateOnFocus: true,
      
      // Dedupe requests within 3 seconds
      dedupingInterval: 3000,
    }
  )

  return {
    events: data,
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
