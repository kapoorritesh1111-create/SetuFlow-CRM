'use client';

import { useEffect } from 'react';
import { ErrorBoundaryView } from '@/components/app/error-boundary-view';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Quote route error:', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      title="Quote workspace unavailable"
      description="The quote workspace failed to load. Try the route again, or return to the lead command center while RFQ, pricing, and negotiation data are checked."
      reset={reset}
      homeHref={PRODUCT_ROUTES.app.leads}
      homeLabel="Return to leads"
    />
  );
}
