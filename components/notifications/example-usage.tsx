/**
 * Example: How to integrate NotificationBell into your app
 * 
 * This file shows example usage patterns for the notification components.
 * You can copy and adapt these examples to your specific needs.
 */

'use client'

import { NotificationBell } from '@/components/notifications'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'

/**
 * Example 1: Simple header with notification bell
 */
export function SimpleHeader() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Tết Connect</h1>
        
        <div className="flex items-center gap-4">
          <NotificationBell userId={user.id} />
          <span className="text-sm">{user.user_metadata?.full_name}</span>
        </div>
      </div>
    </header>
  )
}

/**
 * Example 2: Dashboard layout with notification bell
 */
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth()

  if (!user) return null

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-red-600">Tết Connect</h1>
            <nav className="hidden md:flex gap-4">
              <a href="/dashboard" className="text-sm hover:text-red-600">Trang chủ</a>
              <a href="/events" className="text-sm hover:text-red-600">Sự kiện</a>
              <a href="/photos" className="text-sm hover:text-red-600">Album</a>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <NotificationBell userId={user.id} />
            
            {/* User menu */}
            <div className="flex items-center gap-2">
              <span className="text-sm hidden md:inline">
                {user.user_metadata?.full_name || user.email}
              </span>
              <Button variant="ghost" onClick={signOut}>
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}

/**
 * Example 3: Mobile-friendly header with notification bell
 */
export function MobileHeader() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <header className="border-b bg-white sticky top-0 z-40">
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <h1 className="text-lg font-bold text-red-600">Tết Connect</h1>
        
        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <NotificationBell userId={user.id} />
          
          {/* Menu button for mobile */}
          <Button variant="ghost" className="md:hidden">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
        </div>
      </div>
    </header>
  )
}

/**
 * Example 4: Using notification bell in a specific page
 */
export function EventsPageWithNotifications() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Page header with notification bell */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Sự kiện</h1>
        <NotificationBell userId={user.id} />
      </div>

      {/* Page content */}
      <div className="space-y-4">
        {/* Event list would go here */}
      </div>
    </div>
  )
}

/**
 * Example 5: Standalone notification center page
 */
export function NotificationCenterPage() {
  const { user } = useAuth()
  // In a real implementation, you would fetch all notifications (read and unread)
  // and display them in a full page view

  if (!user) return null

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Trung tâm thông báo</h1>
        <NotificationBell userId={user.id} />
      </div>

      <div className="space-y-4">
        {/* Full notification list would go here */}
        <p className="text-muted-foreground">
          Tất cả thông báo của bạn sẽ hiển thị ở đây
        </p>
      </div>
    </div>
  )
}
