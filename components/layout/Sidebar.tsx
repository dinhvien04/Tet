'use client'

import { Home, Calendar, Image, Users, LogOut, Dice5, ShieldCheck, UserCircle } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { FamilySelector } from '@/components/family/FamilySelector'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  const navItems = [
    { href: '/dashboard', label: 'Trang chủ', icon: Home },
    { href: '/events', label: 'Sự kiện', icon: Calendar },
    { href: '/photos', label: 'Album', icon: Image },
    { href: '/games/bau-cua', label: 'Bầu Cua', icon: Dice5 },
    { href: '/family', label: 'Gia đình', icon: Users },
    { href: '/profile', label: 'Hồ sơ', icon: UserCircle },
  ]

  if (user?.role === 'admin') {
    navItems.push({ href: '/admin', label: 'Quản trị web', icon: ShieldCheck })
  }

  return (
    <aside className={cn('flex h-full flex-col border-r border-border bg-card', className)}>
      <div className="border-b border-border p-6">
        <h1 className="text-2xl font-bold text-primary">Tết Connect</h1>
      </div>

      <div className="p-4 border-b">
        <FamilySelector />
      </div>

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
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t">
        <Button variant="ghost" className="w-full justify-start gap-3" onClick={signOut}>
          <LogOut className="h-5 w-5" />
          <span>Đăng xuất</span>
        </Button>
      </div>
    </aside>
  )
}
