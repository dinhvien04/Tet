import { useState, useCallback } from 'react'
import { getErrorMessage } from '@/lib/errors/api-error-handler'
import { toast } from 'sonner'

/**
 * Hook for handling errors in components
 * Provides error state management and user-friendly error messages
 */
export function useErrorHandler() {
  const [error, setError] = useState<Error | null>(null)
  const [isError, setIsError] = useState(false)

  /**
   * Handle an error and show toast notification
   */
  const handleError = useCallback((err: any, showToast: boolean = true) => {
    const errorMessage = getErrorMessage(err)
    
    setError(err)
    setIsError(true)

    if (showToast) {
      toast.error(errorMessage)
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error handled:', err)
    }

    return errorMessage
  }, [])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
    setIsError(false)
  }, [])

  /**
   * Wrap an async function with error handling
   */
  const withErrorHandling = useCallback(
    <T extends (...args: any[]) => Promise<any>>(fn: T) => {
      return async (...args: Parameters<T>): Promise<ReturnType<T> | null> => {
        try {
          clearError()
          return await fn(...args)
        } catch (err) {
          handleError(err)
          return null
        }
      }
    },
    [handleError, clearError]
  )

  return {
    error,
    isError,
    handleError,
    clearError,
    withErrorHandling,
  }
}
