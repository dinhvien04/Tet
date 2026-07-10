/**
 * Simple in-process TTL cache for short-lived data (leaderboard/stats).
 * Not shared across serverless instances — acceptable for soft caching.
 */

interface Entry<T> {
  value: T
  expiresAt: number
}

const store = new Map<string, Entry<unknown>>()

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  return entry.value as T
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs })
}

export function cacheDelete(key: string): void {
  store.delete(key)
}

export async function cachedQuery<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const hit = cacheGet<T>(key)
  if (hit !== null) return hit
  const value = await fn()
  cacheSet(key, value, ttlMs)
  return value
}
