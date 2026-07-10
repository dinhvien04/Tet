'use client'

import { useEffect } from 'react'
import { purgeServiceWorkersAndCaches, SW_ENABLED } from '@/lib/service-worker'

/**
 * By default disables Service Workers and clears legacy caches so private
 * API/page data is never served across users on a shared device.
 * Set NEXT_PUBLIC_ENABLE_SERVICE_WORKER=true only after a safe SW ships.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Always purge old SW first (even in development)
    void purgeServiceWorkersAndCaches()

    if (SW_ENABLED && process.env.NODE_ENV === 'production') {
      console.warn(
        '[sw] ENABLE_SERVICE_WORKER is true but safe offline SW is not implemented; staying disabled'
      )
    }
  }, [])

  return null
}
