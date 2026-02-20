'use client'

import { Home, Calendar, Image, Users, LogOut, Dice5, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { FamilySelector } from '@/components/family/FamilySelector'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  const navItems = [
    { href: '/dashboard', label: 'Trang chu', icon: Home },
    { href: '/events', label: 'Su kien', icon: Calendar },
    { href: '/photos', label: 'Album', icon: Image },
    { href: '/games/bau-cua', label: 'Bau cua', icon: Dice5 },
    { href: '/family', label: 'Gia dinh', icon: Users },
  ]

  if (user?.role === 'admin') {
    navItems.push({ href: '/admin', label: 'Quan tri web', icon: ShieldCheck })
  }

  const handleSignOut = async () => {
    await signOut()
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} aria-hidden="true" />

      <div className="fixed inset-y-0 left-0 w-64 bg-white z-50 md:hidden flex flex-col shadow-xl">
        <div className="p-6 border-b">
          <p className="text-sm text-gray-600">Xin chao,</p>
          <p className="font-medium truncate">{user?.name || user?.email}</p>
        </div>

        <div className="p-4 border-b">
          <FamilySelector />
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-h-[48px] touch-manipulation active:scale-98',
                  isActive ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-700 active:bg-gray-100'
                )}
              >
                <Icon className="h-6 w-6" />
                <span className="text-base">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t">
          <Button variant="ghost" size="lg" className="w-full justify-start gap-3" onClick={handleSignOut}>
            <LogOut className="h-6 w-6" />
            <span className="text-base">Dang xuat</span>
          </Button>
        </div>
      </div>
    </>
  )
}
