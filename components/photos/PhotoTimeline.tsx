'use client'

import { useMemo } from 'react'
import { PhotoGrid } from './PhotoGrid'

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

interface PhotoTimelineProps {
  photos: Photo[]
  onPhotoClick?: (photo: Photo, index: number) => void
}

interface GroupedPhotos {
  [date: string]: Photo[]
}

export function PhotoTimeline({ photos, onPhotoClick }: PhotoTimelineProps) {
  // Group photos by date
  const groupedPhotos = useMemo(() => {
    const grouped: GroupedPhotos = {}
    
    photos.forEach(photo => {
      const date = new Date(photo.uploaded_at).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      
      if (!grouped[date]) {
        grouped[date] = []
      }
      
      grouped[date].push(photo)
    })
    
    return grouped
  }, [photos])

  // Get sorted dates (newest first)
  const sortedDates = useMemo(() => {
    return Object.keys(groupedPhotos).sort((a, b) => {
      // Parse Vietnamese date format back to compare
      const dateA = groupedPhotos[a][0].uploaded_at
      const dateB = groupedPhotos[b][0].uploaded_at
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })
  }, [groupedPhotos])

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Chưa có ảnh nào</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {sortedDates.map(date => {
        const photosForDate = groupedPhotos[date]
        
        return (
          <div key={date} className="space-y-4">
            {/* Date header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm py-2 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {date}
              </h3>
              <p className="text-sm text-gray-500">
                {photosForDate.length} ảnh
              </p>
            </div>
            
            {/* Photos grid for this date */}
            <PhotoGrid 
              photos={photosForDate} 
              onPhotoClick={onPhotoClick}
            />
          </div>
        )
      })}
    </div>
  )
}
