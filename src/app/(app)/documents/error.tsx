'use client';

import { useEffect } from 'react';
import { ErrorBoundaryView } from '@/components/app/error-boundary-view';

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Documents workspace render error', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      title="Documents workspace unavailable"
      description="The documents workspace failed to load. Retry to restore evidence review, expiry posture, and the lead command center handoff for linked deals."
      reset={reset}
      homeHref="/documents"
      homeLabel="Reload documents"
    />
  );
}
