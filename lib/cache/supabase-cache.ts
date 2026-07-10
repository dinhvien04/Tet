/**
 * @deprecated Replaced by lib/cache/memory-cache.ts
 */
export { cacheGet, cacheSet, cacheDelete, cachedQuery } from './memory-cache'

export const supabaseCache = {
  get: async () => null,
  set: async () => undefined,
  del: async () => undefined,
}

export async function prefetchQuery() {
  return null
}
