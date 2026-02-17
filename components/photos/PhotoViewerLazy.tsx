'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { ComponentProps } from 'react'
import { PhotoViewer } from './PhotoViewer'

// Dynamically import PhotoViewer with loading state
const PhotoViewerDynamic = dynamic(
  () => import('./PhotoViewer').then(mod => ({ default: mod.PhotoViewer })),
  {
    loading: () => (
      <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    ),
    ssr: false // PhotoViewer uses client-side features like keyboard events
  }
)

export function PhotoViewerLazy(props: ComponentProps<typeof PhotoViewer>) {
  return <PhotoViewerDynamic {...props} />
}
