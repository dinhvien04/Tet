'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { LoadingOverlay } from '@/components/ui/loading-overlay'
import { PostCardSkeleton } from '@/components/skeletons/PostCardSkeleton'
import { PhotoGridSkeleton } from '@/components/skeletons/PhotoGridSkeleton'
import { EventCardSkeleton } from '@/components/skeletons/EventCardSkeleton'
import { NotificationSkeleton } from '@/components/skeletons/NotificationSkeleton'
import { Loader2 } from 'lucide-react'

/**
 * Example component demonstrating all loading state patterns
 * This is for documentation and testing purposes
 */
export function LoadingStatesExample() {
  const [showSkeletons, setShowSkeletons] = useState(false)
  const [showSpinner, setShowSpinner] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const [buttonLoading, setButtonLoading] = useState(false)

  const simulateLoading = (setter: (value: boolean) => void) => {
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  return (
    <div className="space-y-8 p-8">
      <h1 className="text-3xl font-bold">Loading States Examples</h1>

      {/* Base Skeleton */}
      <Card>
        <CardHeader>
          <CardTitle>1. Base Skeleton Component</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skeleton Loaders */}
      <Card>
        <CardHeader>
          <CardTitle>2. Component-Specific Skeletons</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button onClick={() => simulateLoading(setShowSkeletons)}>
            Toggle Skeletons
          </Button>

          {showSkeletons ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Post Card Skeleton</h3>
                <PostCardSkeleton />
              </div>

              <div>
                <h3 className="font-semibold mb-2">Photo Grid Skeleton</h3>
                <PhotoGridSkeleton count={4} />
              </div>

              <div>
                <h3 className="font-semibold mb-2">Event Card Skeleton</h3>
                <EventCardSkeleton />
              </div>

              <div>
                <h3 className="font-semibold mb-2">Notification Skeleton</h3>
                <NotificationSkeleton />
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Click button to show skeletons</p>
          )}
        </CardContent>
      </Card>

      {/* Loading Spinners */}
      <Card>
        <CardHeader>
          <CardTitle>3. Loading Spinners</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => simulateLoading(setShowSpinner)}>
            Toggle Spinner
          </Button>

          {showSpinner && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Small</h3>
                <LoadingSpinner size="sm" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Medium with Text</h3>
                <LoadingSpinner size="md" text="Loading..." />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Large</h3>
                <LoadingSpinner size="lg" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading Overlay */}
      <Card>
        <CardHeader>
          <CardTitle>4. Loading Overlay</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => simulateLoading(setShowOverlay)}>
            Show Overlay
          </Button>

          <div className="relative mt-4 p-8 border rounded-lg min-h-[200px]">
            <LoadingOverlay isLoading={showOverlay} text="Processing..." />
            <p>This content is blocked when overlay is active</p>
            <p className="text-muted-foreground mt-2">
              The overlay prevents interaction with underlying content
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Button Loading States */}
      <Card>
        <CardHeader>
          <CardTitle>5. Button Loading States</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <Button
              onClick={() => simulateLoading(setButtonLoading)}
              disabled={buttonLoading}
            >
              {buttonLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Click Me'
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => simulateLoading(setButtonLoading)}
              disabled={buttonLoading}
            >
              {buttonLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Submit'
              )}
            </Button>

            <Button
              variant="destructive"
              onClick={() => simulateLoading(setButtonLoading)}
              disabled={buttonLoading}
            >
              {buttonLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Optimistic UI Pattern */}
      <Card>
        <CardHeader>
          <CardTitle>6. Optimistic UI Updates</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            See PostFeed component for a real example of optimistic reaction updates.
            The UI updates immediately when you click a reaction, then syncs with the server.
          </p>
          <code className="block bg-muted p-4 rounded-lg text-sm">
            {`// Update UI immediately
setPosts(prevPosts => 
  prevPosts.map(post => 
    post.id === postId 
      ? { ...post, reactions: { ...post.reactions, heart: post.reactions.heart + 1 } }
      : post
  )
)

// Then sync with server
await fetch('/api/posts/\${postId}/reactions', { method: 'POST' })`}
          </code>
        </CardContent>
      </Card>
    </div>
  )
}
