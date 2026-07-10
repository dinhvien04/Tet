'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { MobileHeader } from './MobileHeader'
import { MobileMenu } from './MobileMenu'
import { NotificationBell } from '@/components/notifications'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useAuth } from '@/lib/hooks/useAuth'
import { OfflineIndicator } from '@/components/ui/offline-indicator'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Bỏ qua đến nội dung chính
      </a>

      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <Sidebar />
      </div>

      <MobileHeader
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMenuOpen={isMobileMenuOpen}
      />

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="md:pl-64">
        <header className="sticky top-0 z-40 hidden border-b border-border bg-card md:block">
          <div className="flex items-center justify-end gap-3 px-6 py-4">
            <ThemeToggle />
            {user && <NotificationBell userId={user.id} />}
            <div className="text-sm text-muted-foreground" aria-label="Người dùng hiện tại">
              {user?.name || user?.email}
            </div>
          </div>
        </header>

        <main id="main-content" className="p-4 md:p-6 lg:p-8" tabIndex={-1}>
          <div aria-live="polite" className="sr-only" id="status-announcer" />
          {children}
        </main>
      </div>

      <OfflineIndicator showWhenOnline={false} />
    </div>
  )
}
