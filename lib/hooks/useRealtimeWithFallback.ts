import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeWithFallbackOptions<T> {
  channelName: string
  table: string
  filter?: string
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
  pollInterval?: number // milliseconds, default 5000
  fetchData: () => Promise<T>
}

interface RealtimeStatus {
  isConnected: boolean
  isPolling: boolean
  lastUpdate: Date | null
}

/**
 * Custom hook that provides realtime subscriptions with automatic fallback to polling
 * when WebSocket connection fails
 */
export function useRealtimeWithFallback<T>({
  channelName,
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  pollInterval = 5000,
  fetchData,
}: UseRealtimeWithFallbackOptions<T>) {
  const [status, setStatus] = useState<RealtimeStatus>({
    isConnected: false,
    isPolling: false,
    lastUpdate: null,
  })
  
  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  // Start polling as fallback
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return // Already polling

    console.log(`[Realtime Fallback] Starting polling for ${channelName}`)
    setStatus(prev => ({ ...prev, isPolling: true, isConnected: false }))

    pollingIntervalRef.current = setInterval(async () => {
      if (!isMountedRef.current) return
      
      try {
        await fetchData()
        setStatus(prev => ({ ...prev, lastUpdate: new Date() }))
      } catch (error) {
        console.error('[Realtime Fallback] Polling error:', error)
      }
    }, pollInterval)
  }, [channelName, fetchData, pollInterval])

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
      setStatus(prev => ({ ...prev, isPolling: false }))
      console.log(`[Realtime Fallback] Stopped polling for ${channelName}`)
    }
  }, [channelName])

  // Setup realtime subscription
  useEffect(() => {
    isMountedRef.current = true
    let subscriptionAttempts = 0
    const maxAttempts = 3

    const setupSubscription = () => {
      const channel = supabase.channel(channelName)

      // Add INSERT listener if provided
      if (onInsert) {
        channel.on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table,
            ...(filter && { filter }),
          },
          (payload) => {
            if (isMountedRef.current) {
              onInsert(payload)
              setStatus(prev => ({ ...prev, lastUpdate: new Date() }))
            }
          }
        )
      }

      // Add UPDATE listener if provided
      if (onUpdate) {
        channel.on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table,
            ...(filter && { filter }),
          },
          (payload) => {
            if (isMountedRef.current) {
              onUpdate(payload)
              setStatus(prev => ({ ...prev, lastUpdate: new Date() }))
            }
          }
        )
      }

      // Add DELETE listener if provided
      if (onDelete) {
        channel.on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table,
            ...(filter && { filter }),
          },
          (payload) => {
            if (isMountedRef.current) {
              onDelete(payload)
              setStatus(prev => ({ ...prev, lastUpdate: new Date() }))
            }
          }
        )
      }

      // Subscribe with status callback
      channel.subscribe((status, error) => {
        if (!isMountedRef.current) return

        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Connected to ${channelName}`)
          setStatus(prev => ({ ...prev, isConnected: true, isPolling: false }))
          stopPolling() // Stop polling if it was running
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[Realtime] Error on ${channelName}:`, error)
          subscriptionAttempts++
          
          if (subscriptionAttempts >= maxAttempts) {
            console.log(`[Realtime] Max attempts reached, falling back to polling`)
            setStatus(prev => ({ ...prev, isConnected: false }))
            startPolling()
          }
        } else if (status === 'CLOSED') {
          console.log(`[Realtime] Connection closed for ${channelName}`)
          setStatus(prev => ({ ...prev, isConnected: false }))
          
          // Fallback to polling if connection closes unexpectedly
          if (isMountedRef.current) {
            startPolling()
          }
        }
      })

      channelRef.current = channel
    }

    setupSubscription()

    // Cleanup
    return () => {
      isMountedRef.current = false
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      
      stopPolling()
    }
  }, [channelName, table, filter, onInsert, onUpdate, onDelete, startPolling, stopPolling, supabase])

  return status
}
