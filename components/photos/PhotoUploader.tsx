'use client'

import { useState, useRef, ChangeEvent, DragEvent } from 'react'
import { Upload, Camera, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface PhotoUploaderProps {
  familyId: string
  onUploadSuccess?: (photo: any) => void
  onUploadError?: (error: string) => void
}

export function PhotoUploader({ familyId, onUploadSuccess, onUploadError }: PhotoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const validTypes = ['image/jpeg', 'image/png', 'image/heic']
  const maxSize = 10 * 1024 * 1024 // 10MB

  const validateFile = (file: File): string | null => {
    if (!validTypes.includes(file.type)) {
      return 'Định dạng file không hợp lệ. Chỉ chấp nhận JPG, PNG, HEIC.'
    }
    
    if (file.size > maxSize) {
      return 'File quá lớn. Kích thước tối đa 10MB.'
    }
    
    return null
  }

  const handleFileSelect = (file: File) => {
    const error = validateFile(file)
    
    if (error) {
      toast.error(error)
      if (onUploadError) {
        onUploadError(error)
      }
      return
    }

    setSelectedFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Vui lòng chọn ảnh để upload')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('familyId', familyId)

      // Simulate progress (since we can't track actual upload progress easily)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload thất bại')
      }

      const photo = await response.json()
      
      toast.success('Upload ảnh thành công!')
      
      if (onUploadSuccess) {
        onUploadSuccess(photo)
      }

      // Reset state
      setSelectedFile(null)
      setPreviewUrl(null)
      setUploadProgress(0)
      
      // Reset file inputs
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = ''
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload thất bại. Vui lòng thử lại.'
      toast.error(errorMessage)
      
      if (onUploadError) {
        onUploadError(errorMessage)
      }
      
      setUploadProgress(0)
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setUploadProgress(0)
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ''
    }
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const openCamera = () => {
    cameraInputRef.current?.click()
  }

  return (
    <div className="w-full">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {!selectedFile ? (
        <>
          {/* Drag & Drop Area */}
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-gray-300 hover:border-gray-400'
              }
            `}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">
              Kéo thả ảnh vào đây
            </p>
            <p className="text-sm text-gray-500 mb-4">
              hoặc chọn từ thiết bị của bạn
            </p>
            
            <div className="flex gap-3 justify-center flex-wrap">
              <Button
                type="button"
                onClick={openFilePicker}
                variant="outline"
                size="lg"
                className="flex-1 min-w-[140px]"
              >
                <Upload className="w-5 h-5 mr-2" />
                Chọn ảnh
              </Button>
              
              {/* Camera button - prominent on mobile */}
              <Button
                type="button"
                onClick={openCamera}
                variant="default"
                size="lg"
                className="flex-1 min-w-[140px] md:hidden"
              >
                <Camera className="w-5 h-5 mr-2" />
                Chụp ảnh
              </Button>
            </div>

            <p className="text-xs text-gray-400 mt-4">
              Hỗ trợ JPG, PNG, HEIC. Tối đa 10MB
            </p>
          </div>
        </>
      ) : (
        <>
          {/* Preview & Upload */}
          <div className="space-y-4">
            {/* Preview */}
            <div className="relative rounded-lg overflow-hidden bg-gray-100">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-64 object-contain"
                />
              )}
              
              {!isUploading && (
                <button
                  onClick={handleCancel}
                  className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors min-h-[44px] min-w-[44px] touch-manipulation active:scale-95"
                  aria-label="Hủy"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* File info */}
            <div className="text-sm text-gray-600">
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-xs text-gray-400">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>

            {/* Upload progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-center text-gray-600">
                  Đang upload... {uploadProgress}%
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                size="lg"
                className="flex-1"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Đang upload...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Upload ảnh
                  </>
                )}
              </Button>
              
              {!isUploading && (
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  size="lg"
                >
                  Hủy
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
