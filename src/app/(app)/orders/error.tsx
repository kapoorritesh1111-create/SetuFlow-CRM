'use client';

import { useEffect } from 'react';
import { ErrorBoundaryView } from '@/components/app/error-boundary-view';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Orders route failed to render.', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      title="Orders / Execution desk unavailable"
      description="We could not load execution readiness, documentary blockers, or dispatch posture for this workspace. Try again, then fall back to Approval / Send if you need the last stable commercial truth."
      reset={reset}
      homeHref={PRODUCT_ROUTES.app.integrations}
      homeLabel="Back to Approval / Send"
    />
  );
}
