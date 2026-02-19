'use client'

import { useState } from 'react'
import { VideoRecapButton } from './VideoRecapButton'
import { PhotoSelector } from './PhotoSelector'
import { VideoProcessingStatus, ProcessingStatus } from './VideoProcessingStatus'
import { VideoPreview } from './VideoPreview'
import { createVideoRecap, blobToBase64, isVideoCreationSupported } from '@/lib/video-creator'
import { toast } from 'sonner'

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

interface VideoRecapCreatorProps {
  photos: Photo[]
  familyId: string
  maxPhotos?: number
}

export function VideoRecapCreator({ photos, familyId, maxPhotos = 50 }: VideoRecapCreatorProps) {
  const [showSelector, setShowSelector] = useState(false)
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([])
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string>()
  const [videoUrl, setVideoUrl] = useState<string>()

  const handleCreateVideo = () => {
    // Check browser support
    if (!isVideoCreationSupported()) {
      const errorMsg = 'Trình duyệt không hỗ trợ tạo video. Vui lòng dùng Chrome hoặc Edge.'
      setError(errorMsg)
      setProcessingStatus('error')
      toast.error(errorMsg)
      return
    }

    // Check if there are photos
    if (photos.length === 0) {
      const errorMsg = 'Chưa có ảnh nào để tạo video.'
      setError(errorMsg)
      setProcessingStatus('error')
      toast.error(errorMsg)
      return
    }

    // Open photo selector
    setShowSelector(true)
    setSelectedPhotoIds([])
  }

  const handleConfirmSelection = async () => {
    if (selectedPhotoIds.length === 0) {
      const errorMsg = 'Vui lòng chọn ít nhất một ảnh.'
      setError(errorMsg)
      setProcessingStatus('error')
      toast.error(errorMsg)
      return
    }

    // Check photo limit
    if (selectedPhotoIds.length > maxPhotos) {
      const errorMsg = `Tối đa ${maxPhotos} ảnh. Vui lòng bỏ chọn ${selectedPhotoIds.length - maxPhotos} ảnh.`
      setError(errorMsg)
      setProcessingStatus('error')
      toast.error(errorMsg)
      return
    }

    // Close selector
    setShowSelector(false)

    // Get selected photos in order
    const selectedPhotos = selectedPhotoIds
      .map(id => photos.find(p => p.id === id))
      .filter((p): p is Photo => p !== undefined)

    const photoUrls = selectedPhotos.map(p => p.url)

    try {
      // Start processing
      setProcessingStatus('processing')
      setProgress(0)
      setError(undefined)

      // Create video
      const result = await createVideoRecap({
        photos: photoUrls,
        duration: 3000, // 3 seconds per photo
        onProgress: (p) => setProgress(p)
      })

      // Upload video
      setProcessingStatus('uploading')
      const base64Video = await blobToBase64(result.blob)

      const response = await fetch('/api/videos/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId,
          photoUrls,
          videoBlob: base64Video
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Không thể tải video lên. Vui lòng thử lại.')
      }

      const data = await response.json()

      // Show success and preview
      setVideoUrl(data.videoUrl)
      setProcessingStatus('completed')
      toast.success('Tạo video thành công!')

      // Auto-close status after 2 seconds and show preview
      setTimeout(() => {
        setProcessingStatus('idle')
      }, 2000)

    } catch (err) {
      console.error('Error creating video:', err)
      const errorMessage = err instanceof Error ? err.message : 'Không thể tạo video. Vui lòng thử lại.'
      setError(errorMessage)
      setProcessingStatus('error')
      toast.error(errorMessage)
    }
  }

  const handleRetry = () => {
    setProcessingStatus('idle')
    setError(undefined)
    setShowSelector(true)
  }

  const handleCloseStatus = () => {
    setProcessingStatus('idle')
    setError(undefined)
  }

  const handleClosePreview = () => {
    setVideoUrl(undefined)
  }

  return (
    <>
      {/* Create video button */}
      <VideoRecapButton
        onClick={handleCreateVideo}
        disabled={photos.length === 0 || processingStatus === 'processing' || processingStatus === 'uploading'}
      />

      {/* Photo selector modal */}
      {showSelector && (
        <PhotoSelector
          photos={photos}
          selectedPhotoIds={selectedPhotoIds}
          onSelectionChange={setSelectedPhotoIds}
          onConfirm={handleConfirmSelection}
          onCancel={() => setShowSelector(false)}
          maxPhotos={maxPhotos}
        />
      )}

      {/* Processing status modal */}
      <VideoProcessingStatus
        status={processingStatus}
        progress={progress}
        error={error}
        onRetry={handleRetry}
        onClose={handleCloseStatus}
      />

      {/* Video preview modal */}
      {videoUrl && (
        <VideoPreview
          videoUrl={videoUrl}
          onClose={handleClosePreview}
        />
      )}
    </>
  )
}
