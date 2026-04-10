'use client';

import { useEffect } from 'react';
import { ErrorBoundaryView } from '@/components/app/error-boundary-view';

export default function ReportsRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Reports route failed to render', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      title="Reports workspace unavailable"
      description="SETU Flow hit an unexpected issue while rendering reporting totals. Retry to recover summary metrics, drill-through links, and audit-backed totals, or return to the dashboard."
      reset={reset}
      homeHref="/reports"
      homeLabel="Reload reports"
    />
  );
}
