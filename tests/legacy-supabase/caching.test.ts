import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { supabaseCache, cachedQuery, prefetchQuery } from '@/lib/cache/supabase-cache'

describe('Supabase Cache', () => {
  beforeEach(() => {
    supabaseCache.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should cache query results', async () => {
    const mockFetcher = vi.fn().mockResolvedValue({ data: 'test-data', error: null })
    
    // First call - should fetch
    const result1 = await cachedQuery('test-key', mockFetcher)
    expect(result1).toBe('test-data')
    expect(mockFetcher).toHaveBeenCalledTimes(1)
    
    // Second call - should use cache
    const result2 = await cachedQuery('test-key', mockFetcher)
    expect(result2).toBe('test-data')
    expect(mockFetcher).toHaveBeenCalledTimes(1) // Still 1, not called again
  })

  it('should respect TTL and refetch after expiration', async () => {
    const mockFetcher = vi.fn()
      .mockResolvedValueOnce({ data: 'old-data', error: null })
      .mockResolvedValueOnce({ data: 'new-data', error: null })
    
    const shortTTL = 100 // 100ms
    
    // First call
    const result1 = await cachedQuery('test-key', mockFetcher, shortTTL)
    expect(result1).toBe('old-data')
    
    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, 150))
    
    // Second call - should refetch
    const result2 = await cachedQuery('test-key', mockFetcher, shortTTL)
    expect(result2).toBe('new-data')
    expect(mockFetcher).toHaveBeenCalledTimes(2)
  })

  it('should invalidate cache entry', async () => {
    const mockFetcher = vi.fn()
      .mockResolvedValueOnce({ data: 'data-1', error: null })
      .mockResolvedValueOnce({ data: 'data-2', error: null })
    
    // First call
    await cachedQuery('test-key', mockFetcher)
    
    // Invalidate cache
    supabaseCache.invalidate('test-key')
    
    // Second call - should refetch
    const result = await cachedQuery('test-key', mockFetcher)
    expect(result).toBe('data-2')
    expect(mockFetcher).toHaveBeenCalledTimes(2)
  })

  it('should invalidate cache entries by pattern', async () => {
    const mockFetcher1 = vi.fn().mockResolvedValue({ data: 'data-1', error: null })
    const mockFetcher2 = vi.fn().mockResolvedValue({ data: 'data-2', error: null })
    const mockFetcher3 = vi.fn().mockResolvedValue({ data: 'data-3', error: null })
    
    // Cache multiple entries
    await cachedQuery('posts:family-1', mockFetcher1)
    await cachedQuery('posts:family-2', mockFetcher2)
    await cachedQuery('events:family-1', mockFetcher3)
    
    // Invalidate all posts
    supabaseCache.invalidatePattern(/^posts:/)
    
    // Posts should refetch, events should use cache
    await cachedQuery('posts:family-1', mockFetcher1)
    await cachedQuery('posts:family-2', mockFetcher2)
    await cachedQuery('events:family-1', mockFetcher3)
    
    expect(mockFetcher1).toHaveBeenCalledTimes(2)
    expect(mockFetcher2).toHaveBeenCalledTimes(2)
    expect(mockFetcher3).toHaveBeenCalledTimes(1) // Still cached
  })

  it('should handle errors gracefully', async () => {
    const mockFetcher = vi.fn().mockResolvedValue({ 
      data: null, 
      error: new Error('Database error') 
    })
    
    await expect(cachedQuery('test-key', mockFetcher)).rejects.toThrow('Database error')
  })

  it('should prefetch data', async () => {
    const mockFetcher = vi.fn().mockResolvedValue({ data: 'prefetched-data', error: null })
    
    // Prefetch
    await prefetchQuery('test-key', mockFetcher)
    expect(mockFetcher).toHaveBeenCalledTimes(1)
    
    // Use prefetched data
    const result = await cachedQuery('test-key', mockFetcher)
    expect(result).toBe('prefetched-data')
    expect(mockFetcher).toHaveBeenCalledTimes(1) // Not called again
  })

  it('should cleanup expired entries', async () => {
    const mockFetcher = vi.fn().mockResolvedValue({ data: 'test-data', error: null })
    
    // Add entry with short TTL
    await cachedQuery('test-key', mockFetcher, 100)
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150))
    
    // Run cleanup
    supabaseCache.cleanup()
    
    // Should refetch after cleanup
    await cachedQuery('test-key', mockFetcher)
    expect(mockFetcher).toHaveBeenCalledTimes(2)
  })

  it('should clear all cache', async () => {
    const mockFetcher1 = vi.fn().mockResolvedValue({ data: 'data-1', error: null })
    const mockFetcher2 = vi.fn().mockResolvedValue({ data: 'data-2', error: null })
    
    // Cache multiple entries
    await cachedQuery('key-1', mockFetcher1)
    await cachedQuery('key-2', mockFetcher2)
    
    // Clear all
    supabaseCache.clear()
    
    // Should refetch both
    await cachedQuery('key-1', mockFetcher1)
    await cachedQuery('key-2', mockFetcher2)
    
    expect(mockFetcher1).toHaveBeenCalledTimes(2)
    expect(mockFetcher2).toHaveBeenCalledTimes(2)
  })
})

describe('Cache Performance', () => {
  it('should be faster on cache hit', async () => {
    const slowFetcher = vi.fn().mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({ data: 'data', error: null }), 100)
      )
    )
    
    // First call - slow
    const start1 = Date.now()
    await cachedQuery('test-key', slowFetcher)
    const duration1 = Date.now() - start1
    
    // Second call - fast (cached)
    const start2 = Date.now()
    await cachedQuery('test-key', slowFetcher)
    const duration2 = Date.now() - start2
    
    expect(duration2).toBeLessThan(duration1)
    expect(duration2).toBeLessThan(10) // Should be nearly instant
  })
})
