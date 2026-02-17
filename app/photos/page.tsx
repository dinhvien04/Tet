'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout'
import { useFamily } from '@/components/family/FamilyContext'
import { PhotoTimeline } from '@/components/photos/PhotoTimeline'
import { PhotoUploader } from '@/components/photos/PhotoUploader'
import { usePhotos } from '@/lib/hooks/usePhotos'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Loader2 } from 'lucide-react'

export default function PhotosPage() {
  const { currentFamily } = useFamily()
  const { photos, isLoading, mutate } = usePhotos(currentFamily?.id || '')
  const [showUploader, setShowUploader] = useState(false)

  const handleUploadSuccess = () => {
    setShowUploader(false)
    mutate() // Refresh photos
  }

  if (!currentFamily) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="max-w-4xl mx-auto">
            <p className="text-center text-gray-600">
              Vui lòng chọn hoặc tạo một nhà để xem ảnh
            </p>
          </div>
        </AppLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-red-600">
              Album ảnh
            </h1>
            <Button
              onClick={() => setShowUploader(!showUploader)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload ảnh
            </Button>
          </div>

          {showUploader && (
            <div className="mb-6">
              <PhotoUploader
                familyId={currentFamily.id}
                onUploadSuccess={handleUploadSuccess}
              />
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
          ) : (
            <PhotoTimeline photos={(photos || []) as any} />
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
