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
    console.error('Leads route failed to render.', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      eyebrow="Leads temporarily unavailable"
      title="We could not load this leads view"
      description="Your work is still safe. Try loading the view again, or return to the dashboard and continue from there."
      reset={reset}
      homeHref={PRODUCT_ROUTES.app.dashboard}
      homeLabel="Return to dashboard"
    />
  );
}
