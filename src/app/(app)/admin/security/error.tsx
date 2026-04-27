'use client';
import { useEffect } from 'react';
import { ErrorBoundaryView } from '@/components/app/error-boundary-view';
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { useEffect(() => { console.error('Admin security route error:', error); }, [error]); return <ErrorBoundaryView title="Admin Security unavailable" description="This admin workspace could not be loaded. Retry or return to the organization overview." reset={reset} homeHref="/admin/organization" homeLabel="Open admin overview" />; }
