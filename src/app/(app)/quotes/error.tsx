'use client';

import { useEffect } from 'react';
import { ErrorBoundaryView } from '@/components/app/error-boundary-view';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <ErrorBoundaryView title="Route unavailable" description="This workspace route could not be loaded. Try again." reset={reset} homeHref={PRODUCT_ROUTES.app.dashboard} homeLabel="Back to dashboard" />;
}
