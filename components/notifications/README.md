# Notifications Components

Components for displaying and managing user notifications in Tết Connect.

## Components

### NotificationBell

A bell icon button that displays the count of unread notifications and opens a dropdown when clicked.

**Props:**
- `userId` (string, required): The ID of the current user

**Features:**
- Displays badge with unread notification count
- Shows "9+" when count exceeds 9
- Real-time updates via Supabase subscriptions
- Opens dropdown on click
- Automatically marks notifications as read when clicked
- Navigates to event page when notification is clicked

**Usage:**
```tsx
import { NotificationBell } from '@/components/notifications'

function Header() {
  const { user } = useAuth()
  
  return (
    <header>
      <NotificationBell userId={user.id} />
    </header>
  )
}
```

### NotificationDropdown

A dropdown panel that displays a list of notifications with options to mark as read.

**Props:**
- `notifications` (Notification[], required): Array of notification objects
- `onClose` (() => void, required): Callback when dropdown should close
- `onMarkAsRead` ((notificationId: string, link?: string) => void, required): Callback when notification is clicked
- `loading` (boolean, optional): Whether notifications are loading

**Features:**
- Displays notification title, content, and timestamp
- Shows appropriate icon based on notification type (event or task)
- Closes when clicking outside
- Empty state when no notifications
- Loading state
- Scrollable list for many notifications

**Usage:**
```tsx
import { NotificationDropdown } from '@/components/notifications'

function NotificationPanel() {
  const [notifications, setNotifications] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  
  const handleMarkAsRead = async (id: string, link?: string) => {
    await markAsRead(id)
    if (link) {
      router.push(link)
    }
  }
  
  return (
    <NotificationDropdown
      notifications={notifications}
      onClose={() => setIsOpen(false)}
      onMarkAsRead={handleMarkAsRead}
    />
  )
}
```

## Notification Types

The system supports two types of notifications:

1. **event_reminder**: Reminds users about upcoming events
   - Icon: Calendar
   - Created 24 hours before event
   - Sent to all family members

2. **task_reminder**: Reminds users about pending tasks
   - Icon: CheckCircle
   - Created 24 hours before event
   - Sent only to assigned user

## Database Schema

```typescript
interface Notification {
  id: string
  user_id: string
  type: 'event_reminder' | 'task_reminder'
  title: string
  content: string
  link?: string
  read: boolean
  created_at: string
}
```

## Real-time Updates

The NotificationBell component subscribes to Supabase real-time updates:
- New notifications are automatically added to the list
- When a notification is marked as read, it's removed from the unread list
- Badge count updates automatically

## Styling

Components use Tailwind CSS and shadcn/ui components for consistent styling:
- Bell button uses ghost variant
- Badge uses red background for visibility
- Dropdown uses Card component with shadow
- Notifications have hover effects

## Accessibility

- Bell button has `aria-label="Notifications"`
- Close button has `aria-label="Close notifications"`
- Keyboard navigation supported
- Screen reader friendly

## Testing

Unit tests cover:
- Badge display with correct count
- "9+" display for counts over 9
- Dropdown opening/closing
- Mark as read functionality
- Real-time subscription setup
- Empty and loading states
- Click outside to close

Run tests:
```bash
npm test notification-bell.test.tsx notification-dropdown.test.tsx
```
