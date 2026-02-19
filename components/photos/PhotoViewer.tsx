'use client'

import { useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useSwipeGesture } from '@/lib/hooks/useSwipeGesture'

interface PhotoUser {
  id: string
  name: string
  email?: string
  avatar?: string | null
}

interface Photo {
  id: string
  family_id: string
  user_id: string
  url: string
  uploaded_at: string
  users?: PhotoUser
}

interface PhotoViewerProps {
  photos: Photo[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}

export function PhotoViewer({ photos, currentIndex, onClose, onNavigate }: PhotoViewerProps) {
  const currentPhoto = photos[currentIndex]
  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex < photos.length - 1

  // Format upload time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Navigate to previous photo
  const handlePrevious = useCallback(() => {
    if (hasPrevious) {
      onNavigate(currentIndex - 1)
    }
  }, [currentIndex, hasPrevious, onNavigate])

  // Navigate to next photo
  const handleNext = useCallback(() => {
    if (hasNext) {
      onNavigate(currentIndex + 1)
    }
  }, [currentIndex, hasNext, onNavigate])

  // Swipe gesture handlers
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: handleNext,
    onSwipeRight: handlePrevious,
    minSwipeDistance: 50,
  })

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          handlePrevious()
          break
        case 'ArrowRight':
          handleNext()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, handlePrevious, handleNext])

  // Prevent body scroll when viewer is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Header with metadata and close button */}
      <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
        <div className="flex-1">
          <p className="text-white font-medium">
            {currentPhoto.users?.name || 'Unknown'}
          </p>
          <p className="text-gray-300 text-sm">
            {formatTime(currentPhoto.uploaded_at)}
          </p>
        </div>
        
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px] touch-manipulation active:scale-95"
          aria-label="Close viewer"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Main photo display area */}
      <div 
        className="flex-1 relative flex items-center justify-center p-4"
        onTouchStart={swipeHandlers.onTouchStart}
        onTouchMove={swipeHandlers.onTouchMove}
        onTouchEnd={swipeHandlers.onTouchEnd}
      >
        {/* Previous button - larger touch target on mobile */}
        {hasPrevious && (
          <button
            onClick={handlePrevious}
            className="absolute left-2 md:left-4 p-3 md:p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors z-10 min-h-[44px] min-w-[44px] touch-manipulation active:scale-95"
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        )}

        {/* Photo with drag animation */}
        <div 
          className="relative w-full h-full max-w-7xl max-h-full transition-transform duration-200"
          style={{
            transform: swipeHandlers.isDragging ? `translateX(${swipeHandlers.dragOffset.x}px)` : 'translateX(0)',
          }}
        >
          <Image
            src={currentPhoto.url}
            alt={`Photo by ${currentPhoto.users?.name || 'Unknown'}`}
            fill
            className="object-contain select-none"
            sizes="100vw"
            priority
            quality={90}
            draggable={false}
          />
        </div>

        {/* Next button - larger touch target on mobile */}
        {hasNext && (
          <button
            onClick={handleNext}
            className="absolute right-2 md:right-4 p-3 md:p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors z-10 min-h-[44px] min-w-[44px] touch-manipulation active:scale-95"
            aria-label="Next photo"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        )}
      </div>

      {/* Footer with photo counter */}
      <div className="p-4 bg-black/50 backdrop-blur-sm text-center">
        <p className="text-white text-sm">
          {currentIndex + 1} / {photos.length}
        </p>
      </div>

      {/* Click outside to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
        aria-label="Close viewer"
      />
    </div>
  )
}
