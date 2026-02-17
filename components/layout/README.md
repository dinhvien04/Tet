# Layout Components - Responsive Design

This directory contains the responsive layout components for Tết Connect, implementing mobile-first design with Tailwind CSS breakpoints.

## Components

### AppLayout
Main layout wrapper that provides responsive structure for the entire application.

**Features:**
- Desktop: Fixed sidebar (256px width) with top header
- Mobile: Hamburger menu with slide-out navigation
- Responsive padding: `p-4 md:p-6 lg:p-8`
- Notification bell in both mobile and desktop headers

**Usage:**
```tsx
import { AppLayout } from '@/components/layout'

export default function Page() {
  return (
    <AppLayout>
      <YourContent />
    </AppLayout>
  )
}
```

### Sidebar
Desktop navigation sidebar with logo, navigation items, and sign-out button.

**Features:**
- Hidden on mobile (`hidden md:flex`)
- Fixed positioning on desktop
- Active route highlighting
- Icon + text navigation items

### MobileHeader
Mobile-only header with hamburger menu button, logo, and notification bell.

**Features:**
- Visible only on mobile (`md:hidden`)
- Sticky positioning
- Hamburger/close icon toggle
- Compact layout optimized for small screens

### MobileMenu
Slide-out navigation menu for mobile devices.

**Features:**
- Backdrop overlay with click-to-close
- Slide-in animation from left
- User greeting section
- Same navigation items as desktop sidebar
- Touch-friendly tap targets

## Responsive Breakpoints

Following Tailwind CSS default breakpoints:

- **Mobile**: < 768px (default)
- **Tablet**: ≥ 768px (`md:`)
- **Desktop**: ≥ 1024px (`lg:`)

## Implementation Details

### Mobile Layout (< 768px)
- Sidebar hidden
- Mobile header visible with hamburger menu
- Full-width content
- Padding: `p-4`

### Desktop Layout (≥ 768px)
- Sidebar visible and fixed
- Mobile header hidden
- Content offset by sidebar width (`md:pl-64`)
- Desktop header visible
- Padding: `md:p-6 lg:p-8`

## Responsive Card and Image Sizing

### Cards (PostCard, EventCard)
- Font sizes: `text-sm md:text-base`
- Avatar sizes: `h-10 w-10 md:h-12 md:w-12`
- Responsive padding and gaps
- Text truncation and line clamping for long content

### Images (PhotoGrid)
- Grid columns: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`
- Gap: `gap-2 md:gap-4`
- Lazy loading enabled
- Responsive image sizes with Next.js Image component

## Testing

Comprehensive tests in `tests/responsive-layout.test.tsx` covering:
- Component rendering
- Mobile menu toggle functionality
- Responsive class application
- Navigation behavior
- Accessibility (ARIA labels)

Run tests:
```bash
npm test -- tests/responsive-layout.test.tsx
```

## Requirements Validation

This implementation satisfies:
- **Requirement 14.1**: Mobile-friendly interface (< 768px)
- **Requirement 14.2**: Hidden sidebar on mobile, hamburger menu
- **Requirement 14.3**: Adjusted image and card sizes for mobile

## Future Enhancements

- Swipe gestures for mobile menu
- Keyboard navigation support
- Animation transitions for menu open/close
- Persistent menu state in localStorage
