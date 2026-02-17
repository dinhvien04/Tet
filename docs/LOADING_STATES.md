# Loading States Documentation

This document describes the loading state patterns and components used throughout the Tết Connect application.

## Overview

The application uses a comprehensive loading state system with:
- **Skeleton loaders** for content placeholders
- **Loading spinners** for async operations
- **Optimistic UI updates** for instant feedback
- **Loading overlays** for blocking operations

## Components

### 1. Skeleton Loaders

Skeleton loaders provide visual placeholders while content is loading, improving perceived performance.

#### Available Skeleton Components

**PostCardSkeleton**
```tsx
import { PostCardSkeleton } from '@/components/skeletons/PostCardSkeleton'

<PostCardSkeleton />
```

**PhotoGridSkeleton**
```tsx
import { PhotoGridSkeleton } from '@/components/skeletons/PhotoGridSkeleton'

<PhotoGridSkeleton count={8} />
```

**EventCardSkeleton**
```tsx
import { EventCardSkeleton } from '@/components/skeletons/EventCardSkeleton'

<EventCardSkeleton />
```

**NotificationSkeleton**
```tsx
import { NotificationSkeleton } from '@/components/skeletons/NotificationSkeleton'

<NotificationSkeleton />
```

#### Base Skeleton Component

```tsx
import { Skeleton } from '@/components/ui/skeleton'

<Skeleton className="h-4 w-full" />
<Skeleton className="h-10 w-10 rounded-full" />
```

### 2. Loading Spinners

For inline loading indicators during async operations.

```tsx
import { LoadingSpinner } from '@/components/ui/loading-spinner'

<LoadingSpinner size="sm" />
<LoadingSpinner size="md" text="Đang tải..." />
<LoadingSpinner size="lg" />
```

### 3. Loading Overlay

For full-page or container-level blocking loading states.

```tsx
import { LoadingOverlay } from '@/components/ui/loading-overlay'

<div className="relative">
  <LoadingOverlay isLoading={isProcessing} text="Đang xử lý..." />
  {/* Your content */}
</div>
```

### 4. Button Loading States

Buttons should show loading state during async operations:

```tsx
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Đang tải...
    </>
  ) : (
    'Submit'
  )}
</Button>
```

## Patterns

### Pattern 1: List Loading with Skeletons

```tsx
function PostFeed({ familyId }: { familyId: string }) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}
```

### Pattern 2: Infinite Scroll Loading

```tsx
function InfiniteList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  return (
    <>
      {loading ? (
        <PhotoGridSkeleton count={8} />
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {items.map(item => <Item key={item.id} {...item} />)}
        </div>
      )}
      
      {loadingMore && (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      )}
    </>
  )
}
```

### Pattern 3: Optimistic UI Updates

```tsx
function useOptimisticReaction() {
  const [posts, setPosts] = useState<Post[]>([])

  const handleReaction = async (postId: string, type: 'heart' | 'haha') => {
    // Optimistically update UI immediately
    setPosts(prevPosts =>
      prevPosts.map(post => {
        if (post.id === postId) {
          const reactions = { ...post.reactions }
          reactions[type] = (reactions[type] || 0) + 1
          return { ...post, reactions, userReaction: type }
        }
        return post
      })
    )

    try {
      // Perform actual API call
      await fetch(`/api/posts/${postId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ type })
      })
    } catch (error) {
      // Rollback on error
      setPosts(prevPosts =>
        prevPosts.map(post => {
          if (post.id === postId) {
            const reactions = { ...post.reactions }
            reactions[type] = Math.max(0, reactions[type] - 1)
            return { ...post, reactions, userReaction: null }
          }
          return post
        })
      )
    }
  }

  return { posts, handleReaction }
}
```

### Pattern 4: Form Submission Loading

```tsx
function CreateEventForm() {
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await createEvent(formData)
      toast.success('Tạo sự kiện thành công!')
    } catch (error) {
      toast.error('Có lỗi xảy ra')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input disabled={isLoading} />
      <Button type="submit" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Đang tạo...
          </>
        ) : (
          'Tạo sự kiện'
        )}
      </Button>
    </form>
  )
}
```

### Pattern 5: Image Loading with Skeleton

```tsx
function PhotoCard({ photo }: { photo: Photo }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="relative aspect-square">
      {!loaded && (
        <Skeleton className="absolute inset-0" />
      )}
      <Image
        src={photo.url}
        alt="Photo"
        fill
        className="object-cover"
        onLoad={() => setLoaded(true)}
      />
    </div>
  )
}
```

## Best Practices

### 1. Always Show Loading State
Never leave users wondering if something is happening. Always provide visual feedback.

### 2. Use Appropriate Loading Indicators
- **Skeleton loaders**: For initial page/component load
- **Spinners**: For button actions and small async operations
- **Overlays**: For blocking operations that prevent interaction
- **Progress bars**: For operations with measurable progress (uploads, video processing)

### 3. Optimistic Updates for Instant Feedback
For actions like reactions, likes, or simple updates, update the UI immediately and rollback on error.

### 4. Disable Interactive Elements
Always disable buttons and inputs during loading to prevent duplicate submissions.

### 5. Provide Context
Include descriptive text with loading indicators when possible:
- "Đang tải..." (Loading...)
- "Đang upload..." (Uploading...)
- "Đang xử lý..." (Processing...)

### 6. Handle Errors Gracefully
Always provide a way to retry failed operations and clear error messages.

### 7. Skeleton Loader Guidelines
- Match the skeleton structure to the actual content layout
- Use appropriate animation (pulse for content, spin for actions)
- Show realistic number of skeleton items (3-5 for lists)

## Implementation Checklist

When implementing a new feature, ensure:

- [ ] Initial loading state shows skeleton loaders
- [ ] Async operations show loading spinners
- [ ] Buttons are disabled during loading
- [ ] Forms prevent duplicate submissions
- [ ] Optimistic updates for instant feedback (where appropriate)
- [ ] Error states with retry options
- [ ] Loading text provides context
- [ ] Mobile-friendly touch targets (min 44x44px)
- [ ] Accessible loading indicators (aria-labels)

## Examples in Codebase

### Components with Skeleton Loaders
- `components/posts/PostFeed.tsx`
- `components/posts/PostFeedInfinite.tsx`
- `components/photos/PhotoGridInfinite.tsx`
- `components/notifications/NotificationDropdown.tsx`

### Components with Optimistic Updates
- `components/posts/PostFeed.tsx` (reactions)
- `components/posts/PostFeedInfinite.tsx` (reactions)

### Components with Progress Indicators
- `components/photos/PhotoUploader.tsx` (upload progress)
- `components/videos/VideoProcessingStatus.tsx` (processing progress)

### Components with Loading Overlays
- `components/videos/VideoProcessingStatus.tsx`

## Testing Loading States

Always test loading states in your components:

```tsx
it('should show skeleton loader while loading', () => {
  render(<PostFeed familyId="test" />)
  
  expect(screen.getAllByTestId('skeleton')).toHaveLength(3)
})

it('should disable button during loading', async () => {
  const { getByRole } = render(<CreateEventForm />)
  const button = getByRole('button', { name: /tạo sự kiện/i })
  
  fireEvent.click(button)
  
  expect(button).toBeDisabled()
  expect(screen.getByText(/đang tạo/i)).toBeInTheDocument()
})
```

## Performance Considerations

1. **Lazy Loading**: Use Next.js Image component with `loading="lazy"`
2. **Code Splitting**: Lazy load heavy components with `next/dynamic`
3. **Skeleton Count**: Show 3-5 skeleton items, not the full expected count
4. **Animation Performance**: Use CSS transforms for animations (not layout properties)
5. **Debounce**: Debounce rapid state updates to prevent excessive re-renders

## Accessibility

- Use `aria-busy="true"` on loading containers
- Provide `aria-label` for loading spinners
- Ensure loading states are announced to screen readers
- Maintain focus management during loading transitions
- Ensure minimum touch target size (44x44px) on mobile

## Related Files

- `components/ui/skeleton.tsx` - Base skeleton component
- `components/ui/loading-spinner.tsx` - Loading spinner component
- `components/ui/loading-overlay.tsx` - Loading overlay component
- `components/skeletons/*` - Specific skeleton components
- `lib/hooks/useOptimisticUpdate.ts` - Optimistic update hook
