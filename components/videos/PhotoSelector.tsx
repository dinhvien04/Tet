'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Check, X } from 'lucide-react'
import { User } from '@/types/database'

interface Photo {
  id: string
  family_id: string
  user_id: string
  url: string
  uploaded_at: string
  users?: User
}

interface PhotoSelectorProps {
  photos: Photo[]
  selectedPhotoIds: string[]
  onSelectionChange: (photoIds: string[]) => void
  onConfirm: () => void
  onCancel: () => void
  maxPhotos?: number
}

export function PhotoSelector({
  photos,
  selectedPhotoIds,
  onSelectionChange,
  onConfirm,
  onCancel,
  maxPhotos = 50
}: PhotoSelectorProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())

  const handleImageLoad = (photoId: string) => {
    setLoadedImages(prev => new Set(prev).add(photoId))
  }

  const togglePhoto = (photoId: string) => {
    if (selectedPhotoIds.includes(photoId)) {
      // Deselect
      onSelectionChange(selectedPhotoIds.filter(id => id !== photoId))
    } else {
      // Select (if not at max)
      if (selectedPhotoIds.length < maxPhotos) {
        onSelectionChange([...selectedPhotoIds, photoId])
      }
    }
  }

  const selectAll = () => {
    const allIds = photos.slice(0, maxPhotos).map(p => p.id)
    onSelectionChange(allIds)
  }

  const deselectAll = () => {
    onSelectionChange([])
  }

  const isSelected = (photoId: string) => selectedPhotoIds.includes(photoId)
  const isMaxReached = selectedPhotoIds.length >= maxPhotos

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Chọn ảnh cho video
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Đã chọn {selectedPhotoIds.length} / {maxPhotos} ảnh
            </p>
          </div>
          
          <button
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="p-4 border-b flex gap-2">
          <button
            onClick={selectAll}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Chọn tất cả
          </button>
          <button
            onClick={deselectAll}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Bỏ chọn tất cả
          </button>
          {isMaxReached && (
            <span className="ml-auto text-sm text-orange-600 flex items-center">
              Đã đạt giới hạn {maxPhotos} ảnh
            </span>
          )}
        </div>

        {/* Photo grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {photos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Chưa có ảnh nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
              {photos.map((photo) => {
                const selected = isSelected(photo.id)
                const selectionIndex = selectedPhotoIds.indexOf(photo.id)
                
                return (
                  <div
                    key={photo.id}
                    className={`
                      relative aspect-square bg-gray-100 rounded-lg overflow-hidden 
                      cursor-pointer group transition-all duration-200
                      ${selected ? 'ring-4 ring-red-500' : 'hover:ring-2 hover:ring-gray-300'}
                      ${!selected && isMaxReached ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    onClick={() => togglePhoto(photo.id)}
                  >
                    {/* Skeleton loader */}
                    {!loadedImages.has(photo.id) && (
                      <div className="absolute inset-0 bg-gray-200 animate-pulse" />
                    )}
                    
                    {/* Image */}
                    <Image
                      src={photo.url}
                      alt={`Photo by ${photo.users?.name || 'Unknown'}`}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                      className={`
                        object-cover transition-all duration-300
                        ${loadedImages.has(photo.id) ? 'opacity-100' : 'opacity-0'}
                        ${selected ? 'scale-95' : 'group-hover:scale-105'}
                      `}
                      loading="lazy"
                      onLoad={() => handleImageLoad(photo.id)}
                    />
                    
                    {/* Selection overlay */}
                    {selected && (
                      <div className="absolute inset-0 bg-red-500/20" />
                    )}
                    
                    {/* Selection indicator */}
                    <div className={`
                      absolute top-2 right-2 w-8 h-8 rounded-full 
                      flex items-center justify-center
                      transition-all duration-200
                      ${selected 
                        ? 'bg-red-500 scale-100' 
                        : 'bg-white/80 scale-0 group-hover:scale-100'
                      }
                    `}>
                      {selected ? (
                        <span className="text-white font-bold text-sm">
                          {selectionIndex + 1}
                        </span>
                      ) : (
                        <Check className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer with confirm button */}
        <div className="p-4 border-t flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={selectedPhotoIds.length === 0}
            className="
              px-6 py-2 bg-gradient-to-r from-red-600 to-pink-600 
              hover:from-red-700 hover:to-pink-700
              disabled:from-gray-400 disabled:to-gray-500
              text-white font-medium rounded-lg 
              transition-all duration-200
              disabled:cursor-not-allowed disabled:opacity-60
            "
          >
            Tạo Video ({selectedPhotoIds.length})
          </button>
        </div>
      </div>
    </div>
  )
}
