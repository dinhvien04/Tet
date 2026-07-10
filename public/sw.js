// Legacy Service Worker — intentionally inert (privacy).
// Old clients may still load this file; it only purges caches and unregisters.

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n.startsWith('tet-connect'))
          .map((n) => caches.delete(n))
      )
    )
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((n) => n.startsWith('tet-connect'))
          .map((n) => caches.delete(n))
      )
      await self.clients.claim()
      // Unregister this worker so it stops controlling pages
      const reg = await self.registration
      await reg.unregister()
    })()
  )
})

// Do not intercept fetch — no caching of any request
self.addEventListener('fetch', () => {
  // pass-through to network
})
