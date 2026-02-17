'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from '@/lib/service-worker'

/**
 * Component to register service worker on mount
 * Provides offline support and caching capabilities
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only register in production
    if (process.env.NODE_ENV === 'production') {
      registerServiceWorker()
    }
  }, [])

  return null
}
