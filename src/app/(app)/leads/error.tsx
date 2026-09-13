'use client';

import { useCallback, useEffect } from 'react';
import { ErrorBoundaryView } from '@/components/app/error-boundary-view';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

const LEADS_RECOVERY_KEY = 'setu:leads:hard-reload-attempted';

function looksLikeDeployOrChunkError(error: Error & { digest?: string }) {
  const text = `${error.name || ''} ${error.message || ''}`.toLowerCase();
  return !error.digest || /chunkloaderror|loading chunk|dynamically imported module|module script|css_chunk_load_failed/.test(text);
}

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const hardReload = useCallback(() => {
    try {
      sessionStorage.removeItem(LEADS_RECOVERY_KEY);
    } catch {
      // Ignore storage restrictions and still recover with a full navigation.
    }
    window.location.reload();
  }, []);

  useEffect(() => {
    console.error('Leads route failed to render.', error);

    if (!looksLikeDeployOrChunkError(error)) return;

    try {
      if (sessionStorage.getItem(LEADS_RECOVERY_KEY) === '1') return;
      sessionStorage.setItem(LEADS_RECOVERY_KEY, '1');
      window.location.reload();
    } catch {
      // Safari private/restricted storage can throw. Fall back to the visible recovery action.
    }
  }, [error]);

  return (
    <ErrorBoundaryView
      eyebrow="Leads temporarily unavailable"
      title="We could not load this leads view"
      description="The Leads screen hit a client rendering error. Reload the latest app version and try again; your CRM data is not changed by this screen error."
      reset={looksLikeDeployOrChunkError(error) ? hardReload : reset}
      homeHref={PRODUCT_ROUTES.app.dashboard}
      homeLabel="Return to dashboard"
    />
  );
}
