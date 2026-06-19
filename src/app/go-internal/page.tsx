'use client';

/**
 * /go-internal?f=<filename>
 *
 * Bounce page that converts a Next.js client-side navigation (triggered by
 * redirect() in the login server action) into a hard browser navigation
 * to a static HTML file in /public/internal/.
 *
 * Why this exists:
 *   Next.js redirect() after a Server Action performs a soft RSC navigation
 *   internally. When the target is a /public static file (not a page route),
 *   Next.js can't resolve it and returns 404. This page acts as a real route
 *   that Next.js can find, then immediately does window.location.href to
 *   force a full page load of the static file.
 */

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const ALLOWED_FILES = new Set([
  'setuflow-docs.html',
  'setuflow-roadmap.html',
]);

function GoInternalInner() {
  const params = useSearchParams();
  const file = params.get('f') ?? '';

  useEffect(() => {
    const target = ALLOWED_FILES.has(file)
      ? `/internal/${file}`
      : '/dashboard';
    window.location.replace(target);
  }, [file]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0d1724',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        color: '#6e90ae',
        fontSize: '14px',
        gap: '10px',
      }}
    >
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
        style={{ animation: 'spin 1s linear infinite' }}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      Redirecting…
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function GoInternalPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0d1724' }} />}>
      <GoInternalInner />
    </Suspense>
  );
}
