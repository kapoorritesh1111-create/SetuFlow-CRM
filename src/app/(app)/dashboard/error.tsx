'use client';

import { useEffect } from 'react';
import { ErrorBoundaryView } from '@/components/app/error-boundary-view';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

export default function DashboardRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard route failed to render', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      title="Dashboard temporarily unavailable"
      description="SETU Flow hit an unexpected issue while rendering the dashboard. Try again to recover the dashboard shell, or return to the main dashboard route."
      reset={reset}
      homeHref={PRODUCT_ROUTES.app.dashboard}
      homeLabel="Go to dashboard"
    />
  );
}
