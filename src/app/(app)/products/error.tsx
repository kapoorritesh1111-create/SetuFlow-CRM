'use client';

import { useEffect } from 'react';
import { ErrorBoundaryView } from '@/components/app/error-boundary-view';

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Products route error:', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      title="Products workspace unavailable"
      description="The products workspace failed to load. Retry to restore catalog pricing coverage, product readiness, and downstream commercial handoff into leads, pipeline, and quotes."
      reset={reset}
      homeHref="/products"
      homeLabel="Reload products"
    />
  );
}
