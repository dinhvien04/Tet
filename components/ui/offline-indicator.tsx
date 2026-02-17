'use client'

import { useEffect, useState } from 'react'
import { WifiOff, Wifi, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OfflineIndicatorProps {
  className?: string
  showWhenOnline?: boolean
}

/**
 * Displays network connection status
 * Shows a warning when offline and optionally shows online status
 */
export function OfflineIndicator({ 
  className,
  showWhenOnline = false 
}: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [showIndicator, setShowIndicator] = useState(false)

  useEffect(() => {
    // Initial state
    setIsOnline(navigator.onLine)
    setShowIndicator(!navigator.onLine || showWhenOnline)

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      if (showWhenOnline) {
        setShowIndicator(true)
        // Hide online indicator after 3 seconds
        setTimeout(() => setShowIndicator(false), 3000)
      } else {
        setShowIndicator(false)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowIndicator(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [showWhenOnline])

  if (!showIndicator) return null

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-2 shadow-lg transition-all',
        isOnline
          ? 'bg-green-500 text-white'
          : 'bg-red-500 text-white',
        className
      )}
      role="status"
      aria-live="polite"
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          <span className="text-sm font-medium">Đã kết nối</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Không có kết nối mạng</span>
        </>
      )}
    </div>
  )
}

interface RealtimeStatusIndicatorProps {
  isConnected: boolean
  isPolling: boolean
  className?: string
}

/**
 * Displays realtime connection status
 * Shows when using fallback polling mode
 */
export function RealtimeStatusIndicator({
  isConnected,
  isPolling,
  className,
}: RealtimeStatusIndicatorProps) {
  const [showIndicator, setShowIndicator] = useState(false)

  useEffect(() => {
    // Show indicator when polling (fallback mode)
    if (isPolling) {
      setShowIndicator(true)
    } else if (isConnected) {
      // Hide indicator when connected via realtime
      setShowIndicator(false)
    }
  }, [isConnected, isPolling])

  if (!showIndicator) return null

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md bg-yellow-50 px-3 py-1.5 text-yellow-800 border border-yellow-200',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
      <span className="text-xs font-medium">
        Đang cập nhật thủ công
      </span>
    </div>
  )
}
