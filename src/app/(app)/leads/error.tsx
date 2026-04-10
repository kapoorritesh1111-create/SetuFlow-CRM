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
    console.error('Leads route failed to render.', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      title="Leads workspace unavailable"
      description="The leads list could not be rendered for this workspace. Retry the route first, then return to the dashboard if the issue keeps repeating."
      reset={reset}
      homeHref="/dashboard"
      homeLabel="Return to dashboard"
    />
  );
}
