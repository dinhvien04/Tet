'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { ComponentProps } from 'react'
import { VideoRecapCreator } from './VideoRecapCreator'

// Dynamically import VideoRecapCreator with loading state
const VideoRecapCreatorDynamic = dynamic(
  () => import('./VideoRecapCreator').then(mod => ({ default: mod.VideoRecapCreator })),
  {
    loading: () => (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
    ssr: false // Video creation uses Canvas API and MediaRecorder
  }
)

export function VideoRecapCreatorLazy(props: ComponentProps<typeof VideoRecapCreator>) {
  return <VideoRecapCreatorDynamic {...props} />
}
