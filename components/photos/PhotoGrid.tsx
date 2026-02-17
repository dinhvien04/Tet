'use client'

import { useState } from 'react'
import Image from 'next/image'
import { User } from '@/types/database'

interface Photo {
  id: string
  family_id: string
  user_id: string
  url: string
  uploaded_at: string
  users?: User
}

interface PhotoGridProps {
  photos: Photo[]
  onPhotoClick?: (photo: Photo, index: number) => void
}

export function PhotoGrid({ photos, onPhotoClick }: PhotoGridProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())

  const handleImageLoad = (photoId: string) => {
    setLoadedImages(prev => new Set(prev).add(photoId))
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Chưa có ảnh nào</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
      {photos.map((photo, index) => (
        <div
          key={photo.id}
          className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer group"
          onClick={() => onPhotoClick?.(photo, index)}
        >
          {/* Skeleton loader */}
          {!loadedImages.has(photo.id) && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}
          
          {/* Image with lazy loading */}
          <Image
            src={photo.url}
            alt={`Photo by ${photo.users?.name || 'Unknown'}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
            className={`
              object-cover transition-all duration-300
              group-hover:scale-105
              ${loadedImages.has(photo.id) ? 'opacity-100' : 'opacity-0'}
            `}
            loading="lazy"
            onLoad={() => handleImageLoad(photo.id)}
          />
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          
          {/* User info on hover */}
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-white text-xs truncate">
              {photo.users?.name || 'Unknown'}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
