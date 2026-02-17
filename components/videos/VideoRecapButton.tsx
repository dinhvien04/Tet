'use client'

import { Video } from 'lucide-react'

interface VideoRecapButtonProps {
  onClick: () => void
  disabled?: boolean
}

export function VideoRecapButton({ onClick, disabled }: VideoRecapButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="
        inline-flex items-center gap-2 px-4 py-2 
        bg-gradient-to-r from-red-600 to-pink-600 
        hover:from-red-700 hover:to-pink-700
        disabled:from-gray-400 disabled:to-gray-500
        text-white font-medium rounded-lg 
        transition-all duration-200
        disabled:cursor-not-allowed disabled:opacity-60
        shadow-lg hover:shadow-xl
      "
      aria-label="Tạo video recap"
    >
      <Video className="w-5 h-5" />
      <span>Tạo Video Recap</span>
    </button>
  )
}
