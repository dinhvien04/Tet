import { useRef, useState, useCallback } from 'react'

interface SwipeGestureOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  minSwipeDistance?: number
}

interface SwipeGestureHandlers {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: () => void
  isDragging: boolean
  dragOffset: { x: number; y: number }
}

/**
 * Custom hook for handling swipe gestures on touch devices
 * Provides touch event handlers and drag state for implementing swipe interactions
 */
export function useSwipeGesture(options: SwipeGestureOptions): SwipeGestureHandlers {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    minSwipeDistance = 50,
  } = options

  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const touchEndX = useRef<number>(0)
  const touchEndY = useRef<number>(0)
  
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    setIsDragging(true)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return

    touchEndX.current = e.touches[0].clientX
    touchEndY.current = e.touches[0].clientY
    
    const diffX = touchEndX.current - touchStartX.current
    const diffY = touchEndY.current - touchStartY.current
    
    // Limit drag offset to prevent excessive dragging
    const maxOffset = 100
    const limitedOffsetX = Math.max(-maxOffset, Math.min(maxOffset, diffX))
    const limitedOffsetY = Math.max(-maxOffset, Math.min(maxOffset, diffY))
    
    setDragOffset({ x: limitedOffsetX, y: limitedOffsetY })
  }, [isDragging])

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return

    const distanceX = touchEndX.current - touchStartX.current
    const distanceY = touchEndY.current - touchStartY.current
    
    // Determine if horizontal or vertical swipe is dominant
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY)
    
    if (isHorizontalSwipe) {
      // Horizontal swipe
      if (distanceX < -minSwipeDistance && onSwipeLeft) {
        onSwipeLeft()
      } else if (distanceX > minSwipeDistance && onSwipeRight) {
        onSwipeRight()
      }
    } else {
      // Vertical swipe
      if (distanceY < -minSwipeDistance && onSwipeUp) {
        onSwipeUp()
      } else if (distanceY > minSwipeDistance && onSwipeDown) {
        onSwipeDown()
      }
    }

    // Reset state
    setIsDragging(false)
    setDragOffset({ x: 0, y: 0 })
    touchStartX.current = 0
    touchStartY.current = 0
    touchEndX.current = 0
    touchEndY.current = 0
  }, [isDragging, minSwipeDistance, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    isDragging,
    dragOffset,
  }
}
