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
    console.error('Approval / Send route failed to render.', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      title="Approval / Send desk unavailable"
      description="We could not load approval truth, send blockers, or latest outbound posture for this workspace. Try again, then return to Quote if you need the last stable governed pricing view."
      reset={reset}
      homeHref={PRODUCT_ROUTES.app.quotes}
      homeLabel="Back to Quote"
    />
  );
}
