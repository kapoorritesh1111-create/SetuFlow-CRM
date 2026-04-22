'use client';

import { useEffect } from 'react';
import { ErrorBoundaryView } from '@/components/app/error-boundary-view';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Quotes route failed to render.', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      title="Quote workspace unavailable"
      description="We could not load governed pricing, version history, or approval posture for this workspace. Try again, then return to Follow-up if you need a stable recovery route."
      reset={reset}
      homeHref={PRODUCT_ROUTES.app.leads}
      homeLabel="Return to Follow-up"
    />
  );
}
