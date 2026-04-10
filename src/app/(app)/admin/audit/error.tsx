'use client';

import { useEffect } from 'react';
import { ErrorBoundaryView } from '@/components/app/error-boundary-view';

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Admin audit route error:', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      title="Admin audit unavailable"
      description="The audit workspace failed to load. Try again, or return after checking access-sensitive filters, actor links, and recoverable audit visibility."
      reset={reset}
      homeHref="/admin/audit"
      homeLabel="Reload audit"
    />
  );
}
