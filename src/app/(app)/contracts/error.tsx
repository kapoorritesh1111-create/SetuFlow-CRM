'use client';

import { useEffect } from 'react';
import { ErrorBoundaryView } from '@/components/app/error-boundary-view';

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Contracts workspace render error', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      title="Contracts workspace unavailable"
      description="The contracts workspace failed to load. Retry to restore contract blockers, linked document context, audit visibility, and the lead command center return path for the affected deals."
      reset={reset}
      homeHref="/contracts"
      homeLabel="Reload contracts"
    />
  );
}
