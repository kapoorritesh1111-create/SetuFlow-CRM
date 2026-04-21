'use client';

import { useEffect } from 'react';
import { ErrorBoundaryView } from '@/components/app/error-boundary-view';

export default function ResetPasswordError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('reset-password route error', error);
  }, [error]);

  return (
    <ErrorBoundaryView
      title="Password reset unavailable"
      description="We could not load the password reset flow. Try again, or request a new reset link if this one may have expired."
      reset={reset}
      homeHref="/login"
      homeLabel="Go to sign in"
    />
  );
}
