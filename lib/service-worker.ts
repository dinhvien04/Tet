/**
 * Service Worker registration and management
 * Provides offline support and caching capabilities
 */

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      })

      console.log('Service Worker registered:', registration.scope)

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available
            console.log('New service worker available')
            
            // Optionally notify user about update
            if (window.confirm('Có phiên bản mới. Tải lại trang?')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' })
              window.location.reload()
            }
          }
        })
      })

      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })
    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  })
}

export function unregisterServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister()
    }
  })
}

export function clearServiceWorkerCache() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  navigator.serviceWorker.controller?.postMessage({ type: 'CLEAR_CACHE' })
}

/**
 * Check if the app is running offline
 */
export function isOffline(): boolean {
  return typeof window !== 'undefined' && !navigator.onLine
}

/**
 * Listen for online/offline events
 */
export function onNetworkChange(callback: (online: boolean) => void) {
  if (typeof window === 'undefined') return

  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}
