'use client'

import { SWRConfig } from 'swr'
import { swrConfig } from '@/lib/hooks/useSWRConfig'
import { ReactNode } from 'react'

interface SWRProviderProps {
  children: ReactNode
}

/**
 * SWR Provider component
 * Wraps the application with SWR configuration for global caching
 */
export function SWRProvider({ children }: SWRProviderProps) {
  return <SWRConfig value={swrConfig}>{children}</SWRConfig>
}
