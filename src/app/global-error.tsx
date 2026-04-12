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
    console.error('Application render error', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      title="Application error"
      description="The application hit an unexpected error. Retry the route or return to the dashboard."
      reset={reset}
      homeHref={PRODUCT_ROUTES.app.dashboard}
      homeLabel="Dashboard"
    />
  );
}