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
    console.error('Settings lists route error:', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      title="Settings lists unavailable"
      description="The settings workspace failed to load. Try again to recover the screen, or return to the dashboard while the reference data connection is checked."
      reset={reset}
      homeHref="/admin/organization#settings-lists"
      homeLabel="Open Admin settings lists"
    />
  );
}
