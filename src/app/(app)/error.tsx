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
    console.error('app route error', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      title="Workspace route unavailable"
      description="SETU Flow hit an unexpected issue while rendering this workspace route. Try again, then return to Dashboard / Overview if you need a stable recovery point."
      reset={reset}
      homeHref={PRODUCT_ROUTES.app.dashboard}
      homeLabel="Go to Dashboard / Overview"
    />
  );
}
