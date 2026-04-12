'use client';

import { useEffect } from 'react';
import { ErrorBoundaryView } from '@/components/app/error-boundary-view'
import { PRODUCT_ROUTES } from '@/lib/product-contract';

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Pipeline workspace failed to render.', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      title="Pipeline workspace unavailable"
      description="We could not load the live pipeline lanes, summary metrics, or move controls for this workspace. Try again, then return to leads if you need a stable recovery route."
      reset={reset}
      homeHref={PRODUCT_ROUTES.app.leads}
      homeLabel="Return to leads"
    />
  );
}
