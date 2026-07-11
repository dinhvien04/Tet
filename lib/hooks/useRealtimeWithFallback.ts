'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface UseRealtimeWithFallbackOptions<T> {
  channelName: string
  /** @deprecated Supabase realtime removed — kept for API compatibility */
  table?: string
  filter?: string
  onInsert?: (payload: unknown) => void
  onUpdate?: (payload: unknown) => void
  onDelete?: (payload: unknown) => void
  pollInterval?: number
  fetchData: () => Promise<T>
  /** Pause polling when document is hidden */
  pauseWhenHidden?: boolean
}

interface RealtimeStatus {
  isConnected: boolean
  isPolling: boolean
  lastUpdate: Date | null
}

/**
 * Polling-based live updates (MongoDB stack — no Supabase Realtime).
 * Pauses when the tab is hidden to reduce load.
 */
export function useRealtimeWithFallback<T>({
  channelName,
  pollInterval = 15_000,
  fetchData,
  pauseWhenHidden = true,
}: UseRealtimeWithFallbackOptions<T>) {
  const [status, setStatus] = useState<RealtimeStatus>({
    isConnected: false,
    isPolling: false,
    lastUpdate: null,
  })

  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isMountedRef = useRef(true)
  const fetchDataRef = useRef(fetchData)

  // Keep latest fetchData without writing refs during render (react-hooks/refs)
  useEffect(() => {
    fetchDataRef.current = fetchData
  }, [fetchData])

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
      setStatus((prev) => ({ ...prev, isPolling: false }))
    }
  }, [])

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return

    setStatus((prev) => ({ ...prev, isPolling: true, isConnected: false }))

    pollingIntervalRef.current = setInterval(async () => {
      if (!isMountedRef.current) return
      if (pauseWhenHidden && typeof document !== 'undefined' && document.hidden) {
        return
      }

      try {
        await fetchDataRef.current()
        if (isMountedRef.current) {
          setStatus((prev) => ({ ...prev, lastUpdate: new Date() }))
        }
      } catch (error) {
        console.error(`[poll:${channelName}]`, error)
      }
    }, pollInterval)
  }, [channelName, pollInterval, pauseWhenHidden])

  useEffect(() => {
    isMountedRef.current = true
    startPolling()

    const onVisibility = () => {
      // no-op: interval checks document.hidden
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility)
    }

    return () => {
      isMountedRef.current = false
      stopPolling()
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility)
      }
    }
  }, [startPolling, stopPolling])

  return status
}
