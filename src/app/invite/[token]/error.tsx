'use client';

import { useEffect } from 'react';
import { ErrorBoundaryView } from '@/components/app/error-boundary-view';

export default function InviteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('invite route error', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      title="Invitation unavailable"
      description="We could not load this invitation. Try again, or ask the workspace owner to resend it if the link may have expired."
      reset={reset}
      homeHref="/login"
      homeLabel="Go to sign in"
    />
  );
}
