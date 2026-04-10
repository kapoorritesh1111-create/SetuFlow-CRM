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
    console.error('invite-token route error', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      title="<route-specific title>"
      description="<route-specific description>"
      reset={reset}
      homeHref="<route home>"
      homeLabel="<route home label>"
    />
  );
}