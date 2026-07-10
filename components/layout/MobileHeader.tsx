'use client'

import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/notifications'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useAuth } from '@/lib/hooks/useAuth'

interface MobileHeaderProps {
  onMenuToggle: () => void
  isMenuOpen: boolean
}

export function MobileHeader({ onMenuToggle, isMenuOpen }: MobileHeaderProps) {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          aria-label={isMenuOpen ? 'Đóng menu' : 'Mở menu'}
          className="min-h-[44px] min-w-[44px]"
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>

        <h1 className="text-lg font-bold text-primary">Tết Connect</h1>

        <div className="flex min-w-[88px] items-center justify-end gap-1">
          <ThemeToggle />
          {user && <NotificationBell userId={user.id} />}
        </div>
      </div>
    </header>
  )
}
