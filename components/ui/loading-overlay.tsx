import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingOverlayProps {
  isLoading: boolean
  text?: string
  className?: string
}

export function LoadingOverlay({ isLoading, text, className }: LoadingOverlayProps) {
  if (!isLoading) return null

  return (
    <div className={cn(
      'absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center',
      className
    )}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {text && (
          <p className="text-sm font-medium text-muted-foreground">{text}</p>
        )}
      </div>
    </div>
  )
}
