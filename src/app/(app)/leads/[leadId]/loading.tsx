import { RouteLoadingState } from '@/components/app/route-loading-state'

export default function Loading() {
  return (
    <RouteLoadingState
      eyebrow="Lead command center"
      title="Loading lead workspace"
      description="Preparing qualification, workflow, quote, and activity surfaces for this lead."
    />
  )
}
