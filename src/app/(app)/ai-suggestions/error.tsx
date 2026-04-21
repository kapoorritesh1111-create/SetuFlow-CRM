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
    console.error('Contextual AI guidance route failed to render.', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      title="Contextual AI guidance unavailable"
      description="We could not load draft guidance, review state, or workflow suggestions for this workspace. Try again, then return to Follow-up or Quote if you need a stable operating route."
      reset={reset}
      homeHref={PRODUCT_ROUTES.app.leads}
      homeLabel="Return to Follow-up"
    />
  );
}
