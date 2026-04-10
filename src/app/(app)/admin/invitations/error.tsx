'use client';

import { useEffect } from 'react';
import { ErrorBoundaryView } from '@/components/app/error-boundary-view';

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Admin invitations route error:', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      title="Invitations workspace unavailable"
      description="The invitation workspace failed to load. Try again, or return after checking invitation queue health, resend controls, and access-sensitive audit history."
      reset={reset}
      homeHref="/admin/invitations"
      homeLabel="Reload invitations"
    />
  );
}
