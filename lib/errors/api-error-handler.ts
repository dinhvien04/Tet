/**
 * API Error Handler with retry logic and exponential backoff
 */

export interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  shouldRetry?: (error: any, attempt: number) => boolean
}

export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public info?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

/**
 * Check if an error is a network error that should be retried
 */
export function isRetryableError(error: any): boolean {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true
  }

  // Timeout errors
  if (error.name === 'AbortError') {
    return true
  }

  // HTTP status codes that should be retried
  if (error.status) {
    const retryableStatuses = [408, 429, 500, 502, 503, 504]
    return retryableStatuses.includes(error.status)
  }

  return false
}

/**
 * Calculate delay for exponential backoff with jitter
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt)
  
  // Add jitter (random value between 0 and delay)
  const jitter = Math.random() * exponentialDelay
  
  // Cap at maxDelay
  return Math.min(exponentialDelay + jitter, maxDelay)
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    shouldRetry = isRetryableError,
  } = options

  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry if this is the last attempt
      if (attempt === maxRetries) {
        break
      }

      // Check if we should retry this error
      if (!shouldRetry(error, attempt)) {
        throw error
      }

      // Calculate delay and wait
      const delay = calculateBackoffDelay(attempt, baseDelay, maxDelay)
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`)
      }

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Enhanced fetch with retry logic
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  return retryWithBackoff(async () => {
    const response = await fetch(url, options)

    if (!response.ok) {
      const error = new APIError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status
      )

      // Try to parse error details
      try {
        const data = await response.json()
        error.info = data
        error.code = data.code || data.error
      } catch {
        // Response body is not JSON
      }

      throw error
    }

    return response
  }, retryOptions)
}

/**
 * Handle API errors and return user-friendly messages
 */
export function getErrorMessage(error: any): string {
  // Custom API errors
  if (error instanceof APIError) {
    if (error.status === 401) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    }
    if (error.status === 403) {
      return 'Bạn không có quyền thực hiện thao tác này.'
    }
    if (error.status === 404) {
      return 'Không tìm thấy dữ liệu.'
    }
    if (error.status === 429) {
      return 'Đã vượt quá giới hạn sử dụng. Vui lòng thử lại sau.'
    }
    if (error.status && error.status >= 500) {
      return 'Máy chủ gặp sự cố. Vui lòng thử lại sau.'
    }
  }

  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.'
  }

  // Timeout errors
  if (error.name === 'AbortError') {
    return 'Yêu cầu quá lâu. Vui lòng thử lại.'
  }

  // Database errors (Supabase)
  if (error.code) {
    if (error.code === '23505') {
      return 'Dữ liệu đã tồn tại.'
    }
    if (error.code === '42501') {
      return 'Bạn không có quyền thực hiện thao tác này.'
    }
  }

  // Default message
  return error.message || 'Có lỗi xảy ra. Vui lòng thử lại.'
}

/**
 * Global error handler for unhandled promise rejections
 */
export function setupGlobalErrorHandlers() {
  if (typeof window !== 'undefined') {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason)
      
      // Prevent default browser behavior
      event.preventDefault()
      
      // You can send to error tracking service here
      // Example: Sentry.captureException(event.reason)
    })

    // Handle global errors
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error)
      
      // You can send to error tracking service here
      // Example: Sentry.captureException(event.error)
    })
  }
}
