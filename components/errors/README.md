# Error Handling System

This directory contains the global error handling system for Tết Connect.

## Components

### ErrorBoundary

React Error Boundary component that catches errors in the component tree and displays a fallback UI.

**Usage:**

```tsx
import { ErrorBoundary } from '@/components/errors/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <YourComponent />
    </ErrorBoundary>
  )
}
```

**Custom Fallback:**

```tsx
<ErrorBoundary
  fallback={(error, reset) => (
    <div>
      <h1>Oops! {error.message}</h1>
      <button onClick={reset}>Try again</button>
    </div>
  )}
>
  <YourComponent />
</ErrorBoundary>
```

### GlobalErrorHandler

Sets up global error handlers for unhandled promise rejections and errors.

**Usage:**

Already included in the root layout. No additional setup needed.

## Utilities

### API Error Handler

Located in `lib/errors/api-error-handler.ts`

**Retry with Exponential Backoff:**

```typescript
import { retryWithBackoff } from '@/lib/errors/api-error-handler'

const data = await retryWithBackoff(
  async () => {
    const response = await fetch('/api/data')
    return response.json()
  },
  {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
  }
)
```

**Fetch with Retry:**

```typescript
import { fetchWithRetry } from '@/lib/errors/api-error-handler'

const response = await fetchWithRetry('/api/data', {
  method: 'POST',
  body: JSON.stringify({ data: 'value' }),
})
```

**Get User-Friendly Error Message:**

```typescript
import { getErrorMessage } from '@/lib/errors/api-error-handler'

try {
  await someAsyncOperation()
} catch (error) {
  const message = getErrorMessage(error)
  toast.error(message)
}
```

### useErrorHandler Hook

Located in `lib/hooks/useErrorHandler.ts`

**Usage:**

```typescript
import { useErrorHandler } from '@/lib/hooks/useErrorHandler'

function MyComponent() {
  const { error, isError, handleError, clearError, withErrorHandling } = useErrorHandler()

  // Manual error handling
  const handleSubmit = async () => {
    try {
      await submitData()
    } catch (err) {
      handleError(err) // Shows toast and sets error state
    }
  }

  // Automatic error handling
  const handleSubmitAuto = withErrorHandling(async () => {
    await submitData()
  })

  return (
    <div>
      {isError && <div>Error: {error?.message}</div>}
      <button onClick={handleSubmit}>Submit</button>
    </div>
  )
}
```

### API Route Handlers

Located in `lib/errors/api-route-handler.ts`

**With Error Handling:**

```typescript
import { withErrorHandling } from '@/lib/errors/api-route-handler'

export const POST = withErrorHandling(async (request) => {
  // Your handler code
  // Errors are automatically caught and formatted
  return NextResponse.json({ success: true })
})
```

**With Authentication:**

```typescript
import { withAuth } from '@/lib/errors/api-route-handler'

export const POST = withAuth(async (request, user) => {
  // user is automatically validated
  // Errors are automatically caught
  return NextResponse.json({ userId: user.id })
})
```

**Validate Request Body:**

```typescript
import { withAuth, validateBody } from '@/lib/errors/api-route-handler'

export const POST = withAuth(async (request, user) => {
  const body = await request.json()
  
  const validation = validateBody(body, ['name', 'email'])
  if (!validation.valid) {
    return validation.error!
  }

  // Continue with validated data
  return NextResponse.json({ success: true })
})
```

**Check Family Membership:**

```typescript
import { withAuth, checkFamilyMembership } from '@/lib/errors/api-route-handler'

export const POST = withAuth(async (request, user) => {
  const { familyId } = await request.json()
  
  const membership = await checkFamilyMembership(familyId, user.id)
  if (!membership.isMember) {
    return membership.error!
  }

  // User is verified as family member
  return NextResponse.json({ success: true })
})
```

## Error Types

### APIError

Custom error class for API errors with status codes and additional info.

```typescript
import { APIError } from '@/lib/errors/api-error-handler'

throw new APIError('Not found', 404, 'NOT_FOUND', { resource: 'user' })
```

## Retry Logic

The system implements exponential backoff with jitter for retrying failed requests:

- **Base delay**: 1000ms (configurable)
- **Max delay**: 30000ms (configurable)
- **Max retries**: 3 (configurable)
- **Jitter**: Random value added to prevent thundering herd

### Retryable Errors

The following errors are automatically retried:

- Network errors (fetch failures)
- Timeout errors (AbortError)
- HTTP status codes: 408, 429, 500, 502, 503, 504

### Non-Retryable Errors

The following errors are NOT retried:

- Client errors (4xx except 408, 429)
- Authentication errors (401)
- Permission errors (403)
- Validation errors (400)

## SWR Integration

The error handling system is integrated with SWR for data fetching:

```typescript
// Configured in lib/hooks/useSWRConfig.ts
// Automatically retries failed requests
// Shows toast notifications on errors
// Uses exponential backoff
```

## Best Practices

1. **Always use error boundaries** around major sections of your app
2. **Use withErrorHandling** for API routes to standardize error responses
3. **Use useErrorHandler** hook in components for consistent error handling
4. **Show user-friendly messages** using getErrorMessage()
5. **Log errors** in development for debugging
6. **Don't retry** user errors (validation, authentication)
7. **Do retry** network and server errors
8. **Set appropriate timeouts** for long-running operations

## Example: Complete Error Handling Flow

```typescript
// Component
import { useErrorHandler } from '@/lib/hooks/useErrorHandler'
import { fetchWithRetry } from '@/lib/errors/api-error-handler'

function MyComponent() {
  const { withErrorHandling } = useErrorHandler()

  const handleSubmit = withErrorHandling(async (data) => {
    // Fetch with automatic retry
    const response = await fetchWithRetry('/api/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    })

    return response.json()
  })

  return <form onSubmit={handleSubmit}>...</form>
}

// API Route
import { withAuth, validateBody } from '@/lib/errors/api-route-handler'

export const POST = withAuth(async (request, user) => {
  const body = await request.json()
  
  // Validate
  const validation = validateBody(body, ['content', 'type'])
  if (!validation.valid) return validation.error!

  // Process
  const post = await createPost(body, user.id)
  
  return NextResponse.json(post)
})
```

## Testing

Error handling can be tested by:

1. Simulating network failures
2. Mocking API errors
3. Testing retry logic with controlled delays
4. Verifying error messages are user-friendly

See `tests/error-handling.test.ts` for examples.
