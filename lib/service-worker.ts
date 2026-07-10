/**
 * Service Worker management — privacy-first.
 * Default: do NOT register SW that caches private data.
 * Always unregister old workers and clear tet-connect caches.
 */

export const SW_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_SERVICE_WORKER === 'true'

/**
 * Unregister all service workers and delete app caches.
 * Safe to call on every load when SW is disabled.
 */
export async function purgeServiceWorkersAndCaches(): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((r) => r.unregister()))
    }

    if ('caches' in window) {
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((name) => name.startsWith('tet-connect'))
          .map((name) => caches.delete(name))
      )
    }
  } catch (error) {
    console.error('[sw] purge failed', error)
  }
}

/** @deprecated Prefer purge; registration disabled by default for privacy */
export function registerServiceWorker() {
  if (typeof window === 'undefined') return
  // Never register the legacy privacy-leaking worker unless explicitly enabled
  // AND a safe sw is deployed later. Current public/sw.js is unsafe → always purge.
  void purgeServiceWorkersAndCaches()
}

export function unregisterServiceWorker() {
  void purgeServiceWorkersAndCaches()
}

export function clearServiceWorkerCache() {
  void purgeServiceWorkersAndCaches()
}
