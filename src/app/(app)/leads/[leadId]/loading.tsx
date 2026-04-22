import { RouteLoadingState } from '@/components/app/route-loading-state'

export default function Loading() {
  return (
    <RouteLoadingState
      eyebrow="Lead workspace"
      title="Loading lead workspace"
      description="Preparing qualification, workflow, quote, and activity surfaces for this lead."
    />
  )
}
