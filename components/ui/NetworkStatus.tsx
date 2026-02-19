'use client'

import { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { onNetworkChange } from '@/lib/service-worker'

/**
 * Network status indicator component
 * Shows online/offline status to users
 */
export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [showStatus, setShowStatus] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Mark as mounted to prevent hydration mismatch
    setMounted(true)
    
    // Set initial status
    setIsOnline(navigator.onLine)

    // Listen for network changes
    const cleanup = onNetworkChange((online) => {
      setIsOnline(online)
      setShowStatus(true)

      // Hide status after 3 seconds if back online
      if (online) {
        setTimeout(() => setShowStatus(false), 3000)
      }
    })

    return cleanup
  }, [])

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return null
  }

  // Don't show anything if online and not recently changed
  if (isOnline && !showStatus) {
    return null
  }

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-50
        px-4 py-2 rounded-lg shadow-lg
        flex items-center gap-2
        transition-all duration-300
        ${isOnline ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
      `}
    >
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4" />
          <span className="text-sm font-medium">Đã kết nối</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">Không có kết nối</span>
        </>
      )}
    </div>
  )
}
