import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  retryWithBackoff,
  calculateBackoffDelay,
  isRetryableError,
  getErrorMessage,
  APIError,
  fetchWithRetry,
} from '@/lib/errors/api-error-handler'

describe('Error Handling', () => {
  describe('calculateBackoffDelay', () => {
    it('should calculate exponential backoff', () => {
      const baseDelay = 1000
      
      // First attempt: ~1000ms
      const delay0 = calculateBackoffDelay(0, baseDelay, 30000)
      expect(delay0).toBeGreaterThanOrEqual(1000)
      expect(delay0).toBeLessThanOrEqual(3000) // With jitter
      
      // Second attempt: ~2000ms
      const delay1 = calculateBackoffDelay(1, baseDelay, 30000)
      expect(delay1).toBeGreaterThanOrEqual(2000)
      expect(delay1).toBeLessThanOrEqual(6000)
      
      // Third attempt: ~4000ms
      const delay2 = calculateBackoffDelay(2, baseDelay, 30000)
      expect(delay2).toBeGreaterThanOrEqual(4000)
      expect(delay2).toBeLessThanOrEqual(12000)
    })

    it('should cap delay at maxDelay', () => {
      const delay = calculateBackoffDelay(10, 1000, 5000)
      expect(delay).toBeLessThanOrEqual(5000)
    })
  })

  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      const error = new TypeError('Failed to fetch')
      expect(isRetryableError(error)).toBe(true)
    })

    it('should identify timeout errors as retryable', () => {
      const error = new Error('Timeout')
      error.name = 'AbortError'
      expect(isRetryableError(error)).toBe(true)
    })

    it('should identify 5xx errors as retryable', () => {
      const error = new APIError('Server error', 500)
      expect(isRetryableError(error)).toBe(true)
    })

    it('should identify 429 as retryable', () => {
      const error = new APIError('Rate limit', 429)
      expect(isRetryableError(error)).toBe(true)
    })

    it('should not retry 4xx errors (except 408, 429)', () => {
      expect(isRetryableError(new APIError('Bad request', 400))).toBe(false)
      expect(isRetryableError(new APIError('Unauthorized', 401))).toBe(false)
      expect(isRetryableError(new APIError('Forbidden', 403))).toBe(false)
      expect(isRetryableError(new APIError('Not found', 404))).toBe(false)
    })

    it('should retry 408 timeout', () => {
      const error = new APIError('Timeout', 408)
      expect(isRetryableError(error)).toBe(true)
    })
  })

  describe('retryWithBackoff', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should succeed on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success')
      
      const result = await retryWithBackoff(fn, { maxRetries: 3 })
      
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should retry on retryable errors', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new APIError('Server error', 500))
        .mockRejectedValueOnce(new APIError('Server error', 500))
        .mockResolvedValue('success')
      
      const promise = retryWithBackoff(fn, { 
        maxRetries: 3,
        baseDelay: 100,
      })

      // Fast-forward through retries
      await vi.runAllTimersAsync()
      
      const result = await promise
      
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('should not retry non-retryable errors', async () => {
      const fn = vi.fn().mockRejectedValue(new APIError('Bad request', 400))
      
      await expect(retryWithBackoff(fn, { maxRetries: 3 })).rejects.toThrow('Bad request')
      
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should throw after max retries', async () => {
      const fn = vi.fn().mockRejectedValue(new APIError('Server error', 500))
      
      const promise = retryWithBackoff(fn, { 
        maxRetries: 2,
        baseDelay: 100,
      })

      await vi.runAllTimersAsync()
      
      try {
        await promise
        expect.fail('Should have thrown')
      } catch (error: any) {
        expect(error.message).toBe('Server error')
      }
      
      expect(fn).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })

    it('should use custom shouldRetry function', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Custom error'))
      const shouldRetry = vi.fn().mockReturnValue(false)
      
      await expect(
        retryWithBackoff(fn, { maxRetries: 3, shouldRetry })
      ).rejects.toThrow('Custom error')
      
      expect(fn).toHaveBeenCalledTimes(1)
      expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 0)
    })
  })

  describe('getErrorMessage', () => {
    it('should return message for 401 error', () => {
      const error = new APIError('Unauthorized', 401)
      expect(getErrorMessage(error)).toBe('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
    })

    it('should return message for 403 error', () => {
      const error = new APIError('Forbidden', 403)
      expect(getErrorMessage(error)).toBe('Bạn không có quyền thực hiện thao tác này.')
    })

    it('should return message for 404 error', () => {
      const error = new APIError('Not found', 404)
      expect(getErrorMessage(error)).toBe('Không tìm thấy dữ liệu.')
    })

    it('should return message for 429 error', () => {
      const error = new APIError('Rate limit', 429)
      expect(getErrorMessage(error)).toBe('Đã vượt quá giới hạn sử dụng. Vui lòng thử lại sau.')
    })

    it('should return message for 5xx errors', () => {
      const error = new APIError('Server error', 500)
      expect(getErrorMessage(error)).toBe('Máy chủ gặp sự cố. Vui lòng thử lại sau.')
    })

    it('should return message for network errors', () => {
      const error = new TypeError('Failed to fetch')
      expect(getErrorMessage(error)).toBe('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.')
    })

    it('should return message for timeout errors', () => {
      const error = new Error('Timeout')
      error.name = 'AbortError'
      expect(getErrorMessage(error)).toBe('Yêu cầu quá lâu. Vui lòng thử lại.')
    })

    it('should return message for database constraint errors', () => {
      const error = { code: '23505', message: 'Duplicate key' }
      expect(getErrorMessage(error)).toBe('Dữ liệu đã tồn tại.')
    })

    it('should return message for RLS policy errors', () => {
      const error = { code: '42501', message: 'Permission denied' }
      expect(getErrorMessage(error)).toBe('Bạn không có quyền thực hiện thao tác này.')
    })

    it('should return default message for unknown errors', () => {
      const error = new Error('Unknown error')
      expect(getErrorMessage(error)).toBe('Unknown error')
    })

    it('should return default message for errors without message', () => {
      const error = {}
      expect(getErrorMessage(error)).toBe('Có lỗi xảy ra. Vui lòng thử lại.')
    })
  })

  describe('fetchWithRetry', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
      vi.restoreAllMocks()
    })

    it('should fetch successfully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
      })

      const response = await fetchWithRetry('/api/test')
      const data = await response.json()

      expect(data).toEqual({ data: 'test' })
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should retry on 500 error', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' })
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' })
        .mockResolvedValue({
          ok: true,
          json: async () => ({ data: 'test' }),
        })

      const promise = fetchWithRetry('/api/test', {}, { 
        maxRetries: 3,
        baseDelay: 100,
      })

      await vi.runAllTimersAsync()
      const response = await promise
      const data = await response.json()

      expect(data).toEqual({ data: 'test' })
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })

    it('should not retry on 400 error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid data' }),
      })

      await expect(fetchWithRetry('/api/test')).rejects.toThrow('HTTP 400')
      
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should include error info from response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid data', code: 'VALIDATION_ERROR' }),
      })

      try {
        await fetchWithRetry('/api/test')
      } catch (error: any) {
        expect(error).toBeInstanceOf(APIError)
        expect(error.status).toBe(400)
        expect(error.info).toEqual({ error: 'Invalid data', code: 'VALIDATION_ERROR' })
        expect(error.code).toBe('VALIDATION_ERROR')
      }
    })
  })

  describe('APIError', () => {
    it('should create error with all properties', () => {
      const error = new APIError('Test error', 404, 'NOT_FOUND', { resource: 'user' })
      
      expect(error.message).toBe('Test error')
      expect(error.status).toBe(404)
      expect(error.code).toBe('NOT_FOUND')
      expect(error.info).toEqual({ resource: 'user' })
      expect(error.name).toBe('APIError')
    })

    it('should be instanceof Error', () => {
      const error = new APIError('Test error')
      expect(error).toBeInstanceOf(Error)
    })
  })
})
