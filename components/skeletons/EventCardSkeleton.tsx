import { Skeleton } from "@/components/ui/skeleton"

export function EventCardSkeleton() {
  return (
    <div className="bg-card rounded-lg border p-4 space-y-3">
      {/* Title */}
      <Skeleton className="h-6 w-3/4" />
      
      {/* Date and location */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>

      {/* Tasks preview */}
      <div className="pt-2 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    </div>
  )
}
