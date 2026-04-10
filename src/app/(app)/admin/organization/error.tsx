'use client';

import { useEffect } from 'react';
import { ErrorBoundaryView } from '@/components/app/error-boundary-view';

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Admin organization route error:', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      title="Organization workspace unavailable"
      description="The admin overview could not load. Try again, or return after checking governance summaries, settings readiness, and audit cross-links."
      reset={reset}
      homeHref="/admin/organization"
      homeLabel="Reload organization"
    />
  );
}
