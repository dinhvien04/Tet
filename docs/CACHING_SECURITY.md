# Caching & privacy

## Service Worker

**Default: disabled.** Legacy SW that cached `/api/*` and `/dashboard` is replaced with an inert worker that only purges caches and unregisters.

- Client always calls `purgeServiceWorkersAndCaches()` on load and logout.
- Do not set `NEXT_PUBLIC_ENABLE_SERVICE_WORKER=true` until a safe public-asset-only SW exists.
- Never cache authenticated HTML or JSON.

## Authenticated API responses

Use `jsonPrivate()` / `withPrivateNoStore()` from `lib/http-cache.ts` for sensitive routes:

```text
Cache-Control: private, no-store, max-age=0
Pragma: no-cache
```

## Offline

`/offline` may be shown for network failure. It must not display private family data.
