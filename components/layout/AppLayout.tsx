'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { MobileHeader } from './MobileHeader'
import { MobileMenu } from './MobileMenu'
import { NotificationBell } from '@/components/notifications'
import { useAuth } from '@/components/auth/AuthProvider'
import { OfflineIndicator } from '@/components/ui/offline-indicator'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <Sidebar />
      </div>

      {/* Mobile Header - hidden on desktop */}
      <MobileHeader
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMenuOpen={isMobileMenuOpen}
      />

      {/* Mobile Menu - hidden on desktop */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main content */}
      <div className="md:pl-64">
        {/* Desktop Header - hidden on mobile */}
        <header className="hidden md:block sticky top-0 z-40 bg-white border-b">
          <div className="flex items-center justify-end px-6 py-4">
            <div className="flex items-center gap-4">
              {user && <NotificationBell userId={user.id} />}
              <div className="text-sm text-gray-700">
                {user?.user_metadata?.full_name || user?.email}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Global offline indicator */}
      <OfflineIndicator showWhenOnline={false} />
    </div>
  )
}
