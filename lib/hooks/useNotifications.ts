import useSWR from 'swr'

export interface Notification {
  id: string
  user_id: string
  type: 'event_reminder' | 'task_reminder'
  title: string
  content: string
  link: string | null
  read: boolean
  created_at: string
}

/**
 * Custom hook for fetching and caching notifications with SWR
 * Implements automatic revalidation and caching strategies
 */
export function useNotifications(userId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<Notification[]>(
    userId ? `/api/notifications?userId=${userId}` : null,
    {
      // Notifications need frequent updates
      refreshInterval: 15000, // 15 seconds
      
      // Keep previous data while fetching new data
      keepPreviousData: true,
      
      // Revalidate on focus to catch new notifications
      revalidateOnFocus: true,
      
      // Dedupe requests within 1 second
      dedupingInterval: 1000,
    }
  )

  const unreadCount = data?.filter(n => !n.read).length || 0

  return {
    notifications: data,
    unreadCount,
    isLoading,
    isError: error,
    mutate,
  }
}

/**
 * Optimistically update notifications cache
 */
export function useOptimisticNotification() {
  return {
    markAsRead: (userId: string, notificationId: string, mutate: any) => {
      mutate(
        `/api/notifications?userId=${userId}`,
        async (currentNotifications: Notification[] = []) => {
          return currentNotifications.map(notification =>
            notification.id === notificationId
              ? { ...notification, read: true }
              : notification
          )
        },
        {
          // Don't revalidate immediately for better UX
          revalidate: false,
        }
      )
    },
  }
}
