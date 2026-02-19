import { SWRConfiguration } from 'swr'
import { fetchWithRetry, getErrorMessage } from '@/lib/errors/api-error-handler'
import { toast } from 'sonner'

/**
 * Global SWR configuration for the application
 * Implements caching strategies for optimal performance
 */
export const swrConfig: SWRConfiguration = {
  // Revalidate on focus to keep data fresh
  revalidateOnFocus: true,
  
  // Revalidate on reconnect after network issues
  revalidateOnReconnect: true,
  
  // Don't revalidate on mount if data is already cached
  revalidateIfStale: false,
  
  // Keep previous data while revalidating
  keepPreviousData: true,
  
  // Dedupe requests within 2 seconds
  dedupingInterval: 2000,
  
  // Retry on error with exponential backoff
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  
  // Cache data for 5 minutes
  focusThrottleInterval: 5 * 60 * 1000,
  
  // Custom fetcher with error handling and retry logic
  fetcher: async (url: string) => {
    const res = await fetchWithRetry(url, {}, {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
    })
    
    return res.json()
  },
  
  // Handle errors globally
  onError: (error, key) => {
    console.error(`SWR Error for key ${key}:`, error)
    
    // Show user-friendly error message
    const message = getErrorMessage(error)
    toast.error(message)
  },
  
  // Success callback for debugging
  onSuccess: (data, key) => {
    // Can be used for analytics or logging
    if (process.env.NODE_ENV === 'development') {
      console.log(`SWR Success for key ${key}`)
    }
  },
}
