'use client';

import { useEffect } from 'react';
import { ErrorBoundaryView } from '@/components/app/error-boundary-view';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Workspace render error', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      title="Workspace error"
      description="This workspace hit an unexpected error while loading. Retry the route or return to the dashboard."
      reset={reset}
      homeHref={PRODUCT_ROUTES.app.dashboard}
      homeLabel="Dashboard"
    />
  );
}
