'use client'

import { useEffect } from 'react'
import { setupGlobalErrorHandlers } from '@/lib/errors/api-error-handler'

/**
 * Component to setup global error handlers
 * Should be mounted once at the root of the app
 */
export function GlobalErrorHandler() {
  useEffect(() => {
    setupGlobalErrorHandlers()
  }, [])

  return null
}
