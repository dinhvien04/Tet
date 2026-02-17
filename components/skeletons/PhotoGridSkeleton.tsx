import { Skeleton } from "@/components/ui/skeleton"

interface PhotoGridSkeletonProps {
  count?: number
}

export function PhotoGridSkeleton({ count = 8 }: PhotoGridSkeletonProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aspect-square">
          <Skeleton className="h-full w-full" />
        </div>
      ))}
    </div>
  )
}
