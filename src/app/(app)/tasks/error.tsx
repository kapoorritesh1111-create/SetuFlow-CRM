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
    console.error('tasks route error', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      title="Tasks workspace unavailable"
      description="We could not load the supporting task queue for this workspace. Try again, then return to Follow-up if you need the primary operating route."
      reset={reset}
      homeHref={PRODUCT_ROUTES.app.leads}
      homeLabel="Return to Follow-up"
    />
  );
}
