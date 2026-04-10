'use client'

import { useEffect } from 'react'
import { ErrorBoundaryView } from '@/components/app/error-boundary-view'

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Lead command center route error:', error)
  }, [error])

  return (
    <ErrorBoundaryView
      title="Lead command center unavailable"
      description="The lead workspace failed to load. Try again to recover the command center, or return to the leads queue while the lead data connection is checked."
      reset={reset}
      homeHref="/leads"
      homeLabel="Return to leads"
    />
  )
}
