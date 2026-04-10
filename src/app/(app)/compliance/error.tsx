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
    console.error('Compliance workspace render error', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      title="Compliance workspace unavailable"
      description="The compliance workspace failed to load. Retry to restore blocker counts, evidence-linked review status, and the lead command center handoff for the affected deals."
      reset={reset}
      homeHref="/compliance"
      homeLabel="Reload compliance"
    />
  );
}
