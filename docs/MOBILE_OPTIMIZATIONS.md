# Mobile Optimizations - Tết Connect

This document describes the mobile-specific optimizations implemented in Tết Connect to provide an excellent touch experience on mobile devices.

## Overview

Tết Connect follows mobile-first design principles with specific optimizations for touch interactions, ensuring the app is easy and pleasant to use on smartphones and tablets.

## Touch-Friendly Button Sizes

### Implementation

All buttons in the application follow iOS and Android touch target guidelines:

- **Minimum touch target**: 44x44px (iOS Human Interface Guidelines)
- **Responsive sizing**: Larger on mobile, slightly smaller on desktop
- **Touch feedback**: Active scale animation for visual feedback

### Button Sizes

```typescript
// Default button
<Button size="default">Action</Button>
// Mobile: 44px height, Desktop: 40px height

// Small button
<Button size="sm">Small</Button>
// Mobile: 36px height, Desktop: 32px height

// Large button
<Button size="lg">Large</Button>
// Mobile: 48px height, Desktop: 44px height

// Icon button
<Button size="icon">Icon</Button>
// Mobile: 44x44px, Desktop: 40x40px
```

### CSS Classes

All buttons include:
- `min-h-[44px] min-w-[44px]` - Ensures minimum touch target
- `touch-manipulation` - Disables double-tap zoom on touch
- `active:scale-95` - Visual feedback on press

## Swipe Gestures for Photo Viewer

### Features

The photo viewer supports intuitive swipe gestures:

- **Swipe left**: Navigate to next photo
- **Swipe right**: Navigate to previous photo
- **Visual feedback**: Photo follows finger during drag
- **Smooth animations**: 200ms transition after swipe

### Implementation

Uses a custom `useSwipeGesture` hook that provides:

```typescript
const swipeHandlers = useSwipeGesture({
  onSwipeLeft: handleNext,
  onSwipeRight: handlePrevious,
  minSwipeDistance: 50, // Minimum 50px to trigger navigation
})
```

### Swipe Detection

- **Minimum distance**: 50px horizontal movement
- **Direction detection**: Horizontal vs vertical swipe
- **Boundary handling**: No navigation past first/last photo
- **Drag preview**: Real-time visual feedback during swipe

### Usage

```tsx
<div
  onTouchStart={swipeHandlers.onTouchStart}
  onTouchMove={swipeHandlers.onTouchMove}
  onTouchEnd={swipeHandlers.onTouchEnd}
>
  <div
    style={{
      transform: swipeHandlers.isDragging 
        ? `translateX(${swipeHandlers.dragOffset.x}px)` 
        : 'translateX(0)',
    }}
  >
    {/* Content */}
  </div>
</div>
```

## Mobile Camera Access

### Photo Upload Options

The photo uploader provides two methods on mobile:

1. **File picker**: Choose from gallery
2. **Camera capture**: Take photo directly

### Implementation

```tsx
{/* File picker - works on all devices */}
<input
  type="file"
  accept="image/jpeg,image/png,image/heic"
  onChange={handleFileSelect}
/>

{/* Camera - mobile only */}
<input
  type="file"
  accept="image/*"
  capture="environment"
  onChange={handleFileSelect}
  className="md:hidden"
/>
```

### Camera Button

- **Visibility**: Only shown on mobile (`md:hidden`)
- **Prominence**: Primary button style for easy access
- **Size**: Large button (48px height) for easy tapping
- **Icon**: Clear camera icon for recognition

## Additional Mobile Optimizations

### Prevent Unwanted Interactions

```css
/* Prevent text selection during drag */
.select-none

/* Disable image dragging */
draggable="false"

/* Disable double-tap zoom on buttons */
.touch-manipulation
```

### Smooth Animations

All interactive elements use optimized transitions:

```css
/* Drag animations */
.transition-transform .duration-200

/* Button press feedback */
.active:scale-95

/* Smooth hover effects */
.transition-colors
```

### Mobile Menu

The mobile navigation menu includes:

- **Touch-friendly items**: 48px minimum height
- **Large icons**: 24px (6 Tailwind units)
- **Clear text**: 16px base font size
- **Backdrop**: Tap outside to close
- **Smooth slide-in**: Animated entrance

## Testing

All mobile optimizations are covered by unit tests:

```bash
npm run test -- mobile-interactions.test.tsx
```

### Test Coverage

- ✅ Touch-friendly button sizes (44x44px minimum)
- ✅ Swipe gesture navigation (left/right)
- ✅ Swipe boundary handling (first/last photo)
- ✅ Small swipe rejection (< 50px)
- ✅ Camera button visibility on mobile
- ✅ Text selection prevention
- ✅ Smooth drag animations

## Browser Support

Mobile optimizations are tested on:

- **iOS Safari**: 14+
- **Chrome Mobile**: Latest
- **Samsung Internet**: Latest
- **Firefox Mobile**: Latest

## Performance Considerations

### Touch Event Optimization

- Uses `passive` event listeners where possible
- Debounces drag updates to 16ms (60fps)
- Limits drag offset to prevent excessive calculations

### Animation Performance

- Uses `transform` instead of `left/top` for better performance
- Hardware-accelerated CSS transitions
- Minimal repaints during drag

## Accessibility

Mobile optimizations maintain accessibility:

- **Touch targets**: Meet WCAG 2.1 Level AAA (44x44px)
- **Keyboard navigation**: Still works on devices with keyboards
- **Screen readers**: Proper ARIA labels on all interactive elements
- **Focus indicators**: Visible focus rings for keyboard users

## Future Enhancements

Potential improvements for future versions:

- [ ] Pinch-to-zoom on photos
- [ ] Pull-to-refresh on feeds
- [ ] Haptic feedback on interactions (iOS)
- [ ] Swipe-to-delete on list items
- [ ] Long-press context menus

## Resources

- [iOS Human Interface Guidelines - Touch Targets](https://developer.apple.com/design/human-interface-guidelines/ios/visual-design/adaptivity-and-layout/)
- [Material Design - Touch Targets](https://material.io/design/usability/accessibility.html#layout-and-typography)
- [WCAG 2.1 - Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
