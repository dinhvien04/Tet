# Toast Notifications - Tết Connect

## Overview

Toast notifications provide user feedback throughout the Tết Connect application. We use the [Sonner](https://sonner.emilkowal.ski/) library, which provides a simple, elegant, and accessible toast notification system.

## Setup

The toast notification system is already configured in the application:

1. **Toaster Component**: Added to `app/layout.tsx`
2. **Custom Styling**: Configured in `components/ui/sonner.tsx` with theme support
3. **Icons**: Custom icons for each toast type (success, error, info, warning, loading)

## Usage

### Basic Usage

```typescript
import { toast } from 'sonner'

// Success message
toast.success('Tạo bài đăng thành công!')

// Error message
toast.error('Không thể tạo bài đăng. Vui lòng thử lại.')

// Info message
toast.info('Đang xử lý yêu cầu của bạn...')

// Warning message
toast.warning('File quá lớn. Kích thước tối đa 10MB.')
```

### Loading States

For long-running operations, use loading toasts that can be updated:

```typescript
import { toast } from 'sonner'

const toastId = toast.loading('Đang upload ảnh...')

// After operation completes
toast.success('Upload thành công!', { id: toastId })

// Or if it fails
toast.error('Upload thất bại', { id: toastId })
```

### Custom Duration

Control how long toasts are displayed (default is 4 seconds):

```typescript
// Quick message (1 second)
toast.success('Đã sao chép!', { duration: 1000 })

// Important message (10 seconds)
toast.warning('Bạn chưa lưu thay đổi', { duration: 10000 })
```

### With Action Buttons

Add action buttons for user interaction:

```typescript
toast.error('Upload thất bại', {
  action: {
    label: 'Thử lại',
    onClick: () => handleRetry()
  }
})

toast.info('Bạn có thông báo mới', {
  action: {
    label: 'Xem',
    onClick: () => router.push('/notifications')
  }
})
```

## Implementation Examples

### 1. Form Validation

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  
  if (!name.trim()) {
    toast.error('Vui lòng nhập tên')
    return
  }
  
  // Continue with submission...
}
```

### 2. API Calls

```typescript
const createPost = async () => {
  try {
    const response = await fetch('/api/posts', {
      method: 'POST',
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      throw new Error('Failed to create post')
    }
    
    toast.success('Đã tạo bài đăng')
  } catch (error) {
    toast.error('Không thể tạo bài đăng. Vui lòng thử lại.')
  }
}
```

### 3. File Upload with Progress

```typescript
const handleUpload = async (file: File) => {
  const toastId = toast.loading('Đang upload...')
  
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch('/api/photos/upload', {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      throw new Error('Upload failed')
    }
    
    toast.success('Upload ảnh thành công!', { id: toastId })
  } catch (error) {
    toast.error('Upload thất bại', { 
      id: toastId,
      action: {
        label: 'Thử lại',
        onClick: () => handleUpload(file)
      }
    })
  }
}
```

### 4. Clipboard Operations

```typescript
const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(inviteLink)
    toast.success('Đã sao chép link mời!')
  } catch (error) {
    toast.error('Không thể sao chép link. Vui lòng thử lại.')
  }
}
```

## Current Implementation

Toast notifications are currently integrated in the following components:

### Family Management
- **CreateFamilyForm**: Success/error when creating family
- **FamilyInviteCard**: Success/error when copying invite link
- **JoinFamilyPage**: Success/error when joining family

### AI Content Generation
- **AIContentForm**: 
  - Validation errors
  - Success when content is generated
  - Error when generation fails
  - Timeout errors

### Posts & Reactions
- **PostFeed**: Error when reaction fails
- **CreatePostPage**: Success/error when creating post

### Photos
- **PhotoUploader**:
  - File validation errors (type, size)
  - Upload progress
  - Success/error on upload

### Events & Tasks
- **CreateEventForm**: Success/error when creating event
- **AssignTaskForm**: Success/error when assigning task
- **TaskItem**: Success when toggling task status

### Videos
- **VideoRecapCreator**:
  - Browser support errors
  - Photo selection validation
  - Success when video is created
  - Error when creation fails

## Best Practices

### 1. Use Appropriate Toast Types

- **Success**: Completed actions (created, updated, deleted, uploaded)
- **Error**: Failed operations, validation errors, network errors
- **Info**: Informational messages, status updates
- **Warning**: Warnings that need attention but aren't errors
- **Loading**: Long-running operations

### 2. Write Clear Messages

✅ Good:
```typescript
toast.success('Tạo bài đăng thành công!')
toast.error('Không thể tạo bài đăng. Vui lòng thử lại.')
```

❌ Bad:
```typescript
toast.success('Success!')
toast.error('Error')
```

### 3. Provide Context

Include relevant information in error messages:

```typescript
// Good - specific error
toast.error('Định dạng file không hợp lệ. Chỉ chấp nhận JPG, PNG, HEIC.')

// Bad - generic error
toast.error('Invalid file')
```

### 4. Use Loading States for Async Operations

```typescript
// Good - shows progress
const toastId = toast.loading('Đang upload...')
// ... async work
toast.success('Upload thành công!', { id: toastId })

// Bad - no feedback during operation
await uploadFile()
toast.success('Upload thành công!')
```

### 5. Add Retry Actions for Recoverable Errors

```typescript
toast.error('Upload thất bại', {
  action: {
    label: 'Thử lại',
    onClick: () => handleRetry()
  }
})
```

### 6. Adjust Duration Based on Importance

```typescript
// Quick confirmation (1-2 seconds)
toast.success('Đã sao chép!', { duration: 1000 })

// Normal message (4 seconds - default)
toast.success('Tạo bài đăng thành công!')

// Important warning (10+ seconds)
toast.warning('Bạn chưa lưu thay đổi', { duration: 10000 })
```

## Testing

Toast notifications are tested in `tests/toast-notifications.test.tsx`:

- Success messages for various operations
- Error messages for validation and failures
- Info and warning messages
- Loading states with updates
- Toasts with action buttons
- Integration with components

Run tests:
```bash
npm test -- toast-notifications.test.tsx
```

## Accessibility

The Sonner library provides built-in accessibility features:

- ARIA live regions for screen readers
- Keyboard navigation support
- Focus management
- Semantic HTML

## Customization

The toast appearance is customized in `components/ui/sonner.tsx`:

- Custom icons for each toast type
- Theme support (light/dark mode)
- Custom styling with CSS variables
- Border radius and colors from design system

## Examples

See `components/ui/toast-examples.tsx` for interactive examples of all toast types and configurations.

## Future Enhancements

Potential improvements for toast notifications:

1. **Position Options**: Allow toasts at different screen positions
2. **Stacking Behavior**: Configure how multiple toasts stack
3. **Sound Effects**: Optional sound for important notifications
4. **Persistent Toasts**: Toasts that don't auto-dismiss for critical errors
5. **Rich Content**: Support for images or custom components in toasts
6. **Undo Actions**: Quick undo for destructive operations

## Resources

- [Sonner Documentation](https://sonner.emilkowal.ski/)
- [Toast Notification Best Practices](https://www.nngroup.com/articles/toast-notification/)
- [ARIA Live Regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions)
