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
    console.error('Approvals & Sending route failed to render.', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      title="Approvals & Sending unavailable"
      description="We could not load approval status, send blockers, or recent outbound activity for this workspace. Try again, then return to Quote if you need the last stable pricing view."
      reset={reset}
      homeHref={PRODUCT_ROUTES.app.quotes}
      homeLabel="Back to Quote"
    />
  );
}
