'use client'

import { Download, X } from 'lucide-react'
import { useRef } from 'react'

interface VideoPreviewProps {
  videoUrl: string
  onClose: () => void
  onDownload?: () => void
}

export function VideoPreview({ videoUrl, onClose, onDownload }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleDownload = () => {
    if (onDownload) {
      onDownload()
    } else {
      // Default download behavior
      const link = document.createElement('a')
      link.href = videoUrl
      link.download = `tet-recap-${Date.now()}.webm`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
        <h2 className="text-white font-bold text-lg">Video Recap</h2>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="
              inline-flex items-center gap-2 px-4 py-2 
              bg-gradient-to-r from-red-600 to-pink-600 
              hover:from-red-700 hover:to-pink-700
              text-white font-medium rounded-lg 
              transition-all duration-200
              shadow-lg hover:shadow-xl
            "
            aria-label="Tải xuống video"
          >
            <Download className="w-5 h-5" />
            <span className="hidden sm:inline">Tải xuống</span>
          </button>
          
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Video player */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative w-full max-w-5xl">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            autoPlay
            className="w-full rounded-lg shadow-2xl"
            style={{ maxHeight: 'calc(100vh - 200px)' }}
          >
            Trình duyệt của bạn không hỗ trợ video.
          </video>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-black/50 backdrop-blur-sm text-center">
        <p className="text-gray-300 text-sm">
          Video đã được tạo thành công. Bạn có thể tải xuống hoặc chia sẻ với gia đình.
        </p>
      </div>

      {/* Click outside to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
        aria-label="Đóng"
      />
    </div>
  )
}
