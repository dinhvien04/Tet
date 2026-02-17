'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { ComponentProps } from 'react'
import { AIContentForm } from './AIContentForm'

// Dynamically import AIContentForm with loading state
const AIContentFormDynamic = dynamic(
  () => import('./AIContentForm').then(mod => ({ default: mod.AIContentForm })),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
    ssr: false // Form uses client-side state and API calls
  }
)

export function AIContentFormLazy(props: ComponentProps<typeof AIContentForm>) {
  return <AIContentFormDynamic {...props} />
}
