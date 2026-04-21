'use client';

import { useEffect } from 'react';
import { ErrorBoundaryView } from '@/components/app/error-boundary-view';

export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('login route error', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      title="Sign-in unavailable"
      description="We could not load the sign-in flow. Try again, then check your workspace configuration if the problem continues."
      reset={reset}
      homeHref="/"
      homeLabel="Back to home"
    />
  );
}
