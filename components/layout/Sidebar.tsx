'use client'

import { Home, Calendar, Image, Users, LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { FamilySelector } from '@/components/family/FamilySelector'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const { signOut } = useAuth()

  const navItems = [
    { href: '/dashboard', label: 'Trang chủ', icon: Home },
    { href: '/events', label: 'Sự kiện', icon: Calendar },
    { href: '/photos', label: 'Album', icon: Image },
    { href: '/family', label: 'Gia đình', icon: Users },
  ]

  return (
    <aside className={cn('flex flex-col h-full bg-white border-r', className)}>
      {/* Logo */}
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-red-600">Tết Connect</h1>
      </div>

      {/* Family Selector */}
      <div className="p-4 border-b">
        <FamilySelector />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-red-50 text-red-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Sign out button */}
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5" />
          <span>Đăng xuất</span>
        </Button>
      </div>
    </aside>
  )
}
