import { useState, useCallback } from 'react'

interface OptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  rollbackOnError?: boolean
}

/**
 * Hook for optimistic UI updates
 * Updates UI immediately, then performs async operation
 * Rolls back on error if specified
 */
export function useOptimisticUpdate<T>(
  initialData: T,
  options: OptimisticUpdateOptions<T> = {}
) {
  const [data, setData] = useState<T>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const update = useCallback(
    async (
      optimisticValue: T,
      asyncOperation: () => Promise<T>
    ) => {
      const previousData = data
      
      // Optimistically update UI
      setData(optimisticValue)
      setIsLoading(true)
      setError(null)

      try {
        // Perform async operation
        const result = await asyncOperation()
        
        // Update with actual result
        setData(result)
        
        if (options.onSuccess) {
          options.onSuccess(result)
        }
        
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        
        // Rollback to previous state if specified
        if (options.rollbackOnError !== false) {
          setData(previousData)
        }
        
        if (options.onError) {
          options.onError(error)
        }
        
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [data, options]
  )

  return {
    data,
    isLoading,
    error,
    update,
    setData
  }
}
