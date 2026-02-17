'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Loader2, Image as ImageIcon } from 'lucide-react'
import { User } from '@/types/database'
import { PhotoGridSkeleton } from '@/components/skeletons/PhotoGridSkeleton'
import { EmptyState } from '@/components/ui/empty-state'

interface Photo {
  id: string
  family_id: string
  user_id: string
  url: string
  uploaded_at: string
  users?: User
}

interface PhotoGridInfiniteProps {
  familyId: string
  onPhotoClick: (index: number) => void
  pageSize?: number
}

export function PhotoGridInfinite({ 
  familyId, 
  onPhotoClick,
  pageSize = 20 
}: PhotoGridInfiniteProps) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const observerTarget = useRef<HTMLDivElement>(null)

  // Fetch photos with pagination
  const fetchPhotos = useCallback(async (pageNum: number, append = false) => {
    try {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const from = pageNum * pageSize
      const to = from + pageSize - 1

      const response = await fetch(
        `/api/photos?familyId=${familyId}&from=${from}&to=${to}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch photos')
      }

      const data = await response.json()
      
      if (append) {
        setPhotos(prev => [...prev, ...data])
      } else {
        setPhotos(data)
      }

      // Check if there are more photos
      setHasMore(data.length === pageSize)
    } catch (err) {
      console.error('Error fetching photos:', err)
      setError('Không thể tải ảnh. Vui lòng thử lại.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [familyId, pageSize])

  // Initial load
  useEffect(() => {
    fetchPhotos(0)
  }, [fetchPhotos])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          const nextPage = page + 1
          setPage(nextPage)
          fetchPhotos(nextPage, true)
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, loadingMore, loading, page, fetchPhotos])

  if (loading) {
    return <PhotoGridSkeleton count={pageSize} />
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <button
          onClick={() => fetchPhotos(0)}
          className="text-sm text-primary hover:underline"
        >
          Thử lại
        </button>
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="Chưa có ảnh nào"
        description="Hãy upload ảnh đầu tiên để lưu giữ khoảnh khắc với gia đình!"
      />
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-gray-100 hover:opacity-90 transition-opacity"
            onClick={() => onPhotoClick(index)}
          >
            <Image
              src={photo.url}
              alt={`Photo by ${photo.users?.name || 'Unknown'}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              loading="lazy"
              quality={75}
            />
          </div>
        ))}
      </div>

      {/* Infinite scroll trigger */}
      {hasMore && (
        <div ref={observerTarget} className="flex items-center justify-center py-8">
          {loadingMore && (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          )}
        </div>
      )}
      
      {!hasMore && photos.length > 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            Đã hiển thị tất cả ảnh
          </p>
        </div>
      )}
    </>
  )
}
