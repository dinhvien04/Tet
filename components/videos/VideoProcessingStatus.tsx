'use client'

import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export type ProcessingStatus = 'idle' | 'processing' | 'uploading' | 'completed' | 'error'

interface VideoProcessingStatusProps {
  status: ProcessingStatus
  progress?: number
  error?: string
  onRetry?: () => void
  onClose?: () => void
}

export function VideoProcessingStatus({
  status,
  progress = 0,
  error,
  onRetry,
  onClose
}: VideoProcessingStatusProps) {
  if (status === 'idle') {
    return null
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'processing':
        return {
          icon: <Loader2 className="w-12 h-12 text-red-600 animate-spin" />,
          title: 'Đang xử lý video...',
          description: 'Vui lòng đợi trong giây lát',
          showProgress: true
        }
      case 'uploading':
        return {
          icon: <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />,
          title: 'Đang tải lên...',
          description: 'Video đang được lưu trữ',
          showProgress: false
        }
      case 'completed':
        return {
          icon: <CheckCircle className="w-12 h-12 text-green-600" />,
          title: 'Hoàn thành!',
          description: 'Video đã được tạo thành công',
          showProgress: false
        }
      case 'error':
        return {
          icon: <XCircle className="w-12 h-12 text-red-600" />,
          title: 'Có lỗi xảy ra',
          description: error || 'Không thể tạo video. Vui lòng thử lại.',
          showProgress: false
        }
      default:
        return {
          icon: null,
          title: '',
          description: '',
          showProgress: false
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          {config.icon}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
          {config.title}
        </h3>

        {/* Description */}
        <p className="text-gray-600 text-center mb-4">
          {config.description}
        </p>

        {/* Progress bar */}
        {config.showProgress && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-red-600 to-pink-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 text-center mt-2">
              {Math.round(progress)}%
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 justify-center">
          {status === 'error' && onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Thử lại
            </button>
          )}
          
          {(status === 'completed' || status === 'error') && onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Đóng
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
