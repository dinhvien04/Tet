'use client'

import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/notifications'
import { useAuth } from '@/components/auth/AuthProvider'

interface MobileHeaderProps {
  onMenuToggle: () => void
  isMenuOpen: boolean
}

export function MobileHeader({ onMenuToggle, isMenuOpen }: MobileHeaderProps) {
  const { user } = useAuth()

  return (
    <header className="md:hidden sticky top-0 z-50 bg-white border-b">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Hamburger menu button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          aria-label={isMenuOpen ? 'Đóng menu' : 'Mở menu'}
        >
          {isMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>

        {/* Logo */}
        <h1 className="text-lg font-bold text-red-600">Tết Connect</h1>

        {/* Notification bell */}
        <div className="w-10">
          {user && <NotificationBell userId={user.id} />}
        </div>
      </div>
    </header>
  )
}
