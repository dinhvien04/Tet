'use client'

import { Check, ChevronDown, Home } from 'lucide-react'
import { useFamily } from './FamilyContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export function FamilySelector() {
  const { currentFamily, families, setCurrentFamily } = useFamily()

  // Don't show selector if user only has one family
  if (families.length <= 1) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between gap-2"
          aria-label="Chọn nhà"
        >
          <div className="flex items-center gap-2 truncate">
            <Home className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{currentFamily?.name || 'Chọn nhà'}</span>
          </div>
          <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {families.map((family) => (
          <DropdownMenuItem
            key={family.id}
            onClick={() => setCurrentFamily(family)}
            className={cn(
              'cursor-pointer',
              currentFamily?.id === family.id && 'bg-accent'
            )}
          >
            <div className="flex items-center justify-between w-full">
              <span className="truncate">{family.name}</span>
              {currentFamily?.id === family.id && (
                <Check className="h-4 w-4 flex-shrink-0 ml-2" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
