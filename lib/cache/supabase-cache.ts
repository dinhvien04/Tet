import { createClient } from '@/lib/supabase'

/**
 * Cache configuration for Supabase queries
 * Implements in-memory caching with TTL (Time To Live)
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class SupabaseCache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Get data from cache or fetch from Supabase
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const cached = this.cache.get(key)
    const now = Date.now()

    // Return cached data if still valid
    if (cached && now - cached.timestamp < cached.ttl) {
      return cached.data as T
    }

    // Fetch fresh data
    const data = await fetcher()

    // Store in cache
    this.cache.set(key, {
      data,
      timestamp: now,
      ttl,
    })

    return data
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string) {
    this.cache.delete(key)
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: RegExp) {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear()
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// Singleton instance
export const supabaseCache = new SupabaseCache()

// Run cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    supabaseCache.cleanup()
  }, 5 * 60 * 1000)
}

/**
 * Cached Supabase query helper
 */
export async function cachedQuery<T>(
  key: string,
  query: () => Promise<{ data: T | null; error: any }>,
  ttl?: number
): Promise<T | null> {
  return supabaseCache.get(
    key,
    async () => {
      const { data, error } = await query()
      if (error) throw error
      return data
    },
    ttl
  )
}

/**
 * Prefetch data and store in cache
 */
export async function prefetchQuery<T>(
  key: string,
  query: () => Promise<{ data: T | null; error: any }>,
  ttl?: number
): Promise<void> {
  try {
    await cachedQuery(key, query, ttl)
  } catch (error) {
    console.error('Prefetch error:', error)
  }
}
