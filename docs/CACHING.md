# Caching Strategy Documentation

## Overview

Tết Connect implements a comprehensive caching strategy to improve performance, reduce server load, and provide a better user experience. The caching system uses multiple layers:

1. **SWR (Stale-While-Revalidate)** - Client-side data fetching and caching
2. **Supabase Query Cache** - In-memory caching for database queries
3. **Service Worker** - Offline support and asset caching

## SWR Configuration

### Global Configuration

Located in `lib/hooks/useSWRConfig.ts`, the global SWR configuration provides:

- **Automatic Revalidation**: Data is revalidated on focus and reconnect
- **Deduplication**: Multiple requests to the same endpoint are deduplicated
- **Error Retry**: Failed requests are retried with exponential backoff
- **Optimistic Updates**: UI updates immediately before server confirmation

### Cache Duration by Resource Type

| Resource | Refresh Interval | Dedupe Interval | Use Case |
|----------|-----------------|-----------------|----------|
| Posts | 30 seconds | 2 seconds | Frequently updated content |
| Photos | 60 seconds | 5 seconds | Less frequent updates |
| Events | 45 seconds | 3 seconds | Moderate update frequency |
| Notifications | 15 seconds | 1 second | Real-time updates needed |

## Custom Hooks

### usePosts

```typescript
import { usePosts, useOptimisticPost } from '@/lib/hooks/usePosts'

function MyComponent({ familyId }) {
  const { posts, isLoading, isError, mutate } = usePosts(familyId)
  const { addPost, updateReaction } = useOptimisticPost()
  
  // Optimistically add a new post
  const handleAddPost = (newPost) => {
    addPost(familyId, newPost, mutate)
  }
  
  return <div>{/* render posts */}</div>
}
```

### usePhotos

```typescript
import { usePhotos, useOptimisticPhoto } from '@/lib/hooks/usePhotos'

function PhotoGallery({ familyId }) {
  const { photos, isLoading, mutate } = usePhotos(familyId)
  const { addPhoto } = useOptimisticPhoto()
  
  // Optimistically add a new photo
  const handleUpload = (newPhoto) => {
    addPhoto(familyId, newPhoto, mutate)
  }
  
  return <div>{/* render photos */}</div>
}
```

### useEvents

```typescript
import { useEvents, useOptimisticEvent } from '@/lib/hooks/useEvents'

function EventList({ familyId }) {
  const { events, isLoading, mutate } = useEvents(familyId)
  const { addEvent } = useOptimisticEvent()
  
  return <div>{/* render events */}</div>
}
```

### useNotifications

```typescript
import { useNotifications, useOptimisticNotification } from '@/lib/hooks/useNotifications'

function NotificationBell({ userId }) {
  const { notifications, unreadCount, mutate } = useNotifications(userId)
  const { markAsRead } = useOptimisticNotification()
  
  const handleClick = (notificationId) => {
    markAsRead(userId, notificationId, mutate)
  }
  
  return <div>{/* render notifications */}</div>
}
```

## Supabase Query Cache

### Usage

```typescript
import { cachedQuery, prefetchQuery, supabaseCache } from '@/lib/cache/supabase-cache'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

// Cached query with 5-minute TTL
const posts = await cachedQuery(
  'posts:family-123',
  () => supabase.from('posts').select('*').eq('family_id', '123'),
  5 * 60 * 1000
)

// Prefetch data for faster navigation
await prefetchQuery(
  'events:family-123',
  () => supabase.from('events').select('*').eq('family_id', '123')
)

// Invalidate cache when data changes
supabaseCache.invalidate('posts:family-123')

// Invalidate all posts caches
supabaseCache.invalidatePattern(/^posts:/)
```

### Cache Management

- **Automatic Cleanup**: Expired entries are cleaned up every 5 minutes
- **Manual Invalidation**: Use `invalidate()` or `invalidatePattern()` to clear cache
- **TTL Configuration**: Default 5 minutes, customizable per query

## Service Worker

### Features

- **Offline Support**: App works offline with cached data
- **Asset Caching**: Static assets are cached for faster loading
- **Network-First Strategy**: API requests use network first, fallback to cache
- **Cache-First Strategy**: Static assets use cache first for speed

### Registration

Service worker is automatically registered in the root layout:

```typescript
import { registerServiceWorker } from '@/lib/service-worker'

useEffect(() => {
  registerServiceWorker()
}, [])
```

### Cache Management

```typescript
import { clearServiceWorkerCache, unregisterServiceWorker } from '@/lib/service-worker'

// Clear all service worker caches
clearServiceWorkerCache()

// Unregister service worker
unregisterServiceWorker()
```

## Network Status

The `NetworkStatus` component shows online/offline status:

```typescript
import { NetworkStatus } from '@/components/ui/NetworkStatus'

function Layout({ children }) {
  return (
    <>
      {children}
      <NetworkStatus />
    </>
  )
}
```

## Best Practices

### 1. Use Optimistic Updates

Optimistic updates provide instant feedback to users:

```typescript
const { addPost } = useOptimisticPost()

// Update UI immediately, then sync with server
addPost(familyId, newPost, mutate)
```

### 2. Invalidate Cache on Mutations

Always invalidate cache after data changes:

```typescript
// After creating a post
await fetch('/api/posts', { method: 'POST', body: JSON.stringify(post) })
mutate(`/api/posts?familyId=${familyId}`)
```

### 3. Prefetch Data

Prefetch data for better navigation experience:

```typescript
// Prefetch event details when hovering over event card
<EventCard
  onMouseEnter={() => prefetchQuery(`event:${eventId}`, fetchEvent)}
/>
```

### 4. Handle Offline State

Check network status before making requests:

```typescript
import { isOffline } from '@/lib/service-worker'

if (isOffline()) {
  toast.error('Không có kết nối mạng')
  return
}
```

### 5. Configure Cache Duration

Adjust cache duration based on data volatility:

```typescript
// Frequently changing data - short TTL
useSWR('/api/notifications', { refreshInterval: 15000 })

// Rarely changing data - long TTL
useSWR('/api/family-info', { refreshInterval: 300000 })
```

## Performance Benefits

### Before Caching
- Every page load fetches all data from server
- Network requests on every interaction
- Slow perceived performance
- High server load

### After Caching
- Initial data from cache (instant)
- Background revalidation keeps data fresh
- Optimistic updates for instant feedback
- Reduced server load by 60-80%

## Monitoring

### Cache Hit Rate

Monitor cache effectiveness in development:

```typescript
// In useSWRConfig.ts
onSuccess: (data, key) => {
  console.log(`Cache hit for ${key}`)
}
```

### Network Requests

Use browser DevTools Network tab to verify:
- Reduced number of requests
- Faster response times
- Proper cache headers

## Troubleshooting

### Cache Not Updating

If cache isn't updating, check:
1. Refresh interval configuration
2. Revalidation settings
3. Manual cache invalidation after mutations

### Stale Data

If seeing stale data:
1. Reduce refresh interval
2. Enable `revalidateOnFocus`
3. Manually trigger revalidation with `mutate()`

### Service Worker Issues

If service worker not working:
1. Check HTTPS (required for service workers)
2. Verify `/sw.js` is accessible
3. Check browser console for errors
4. Clear browser cache and re-register

## Future Improvements

- [ ] Implement cache persistence with IndexedDB
- [ ] Add cache size limits and LRU eviction
- [ ] Implement background sync for offline mutations
- [ ] Add cache warming on app startup
- [ ] Implement predictive prefetching
