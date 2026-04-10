'use client';
import { useEffect } from 'react';
import { ErrorBoundaryView } from '@/components/app/error-boundary-view';
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void; }) { useEffect(() => { console.error('Trade events route error:', error); }, [error]); return <ErrorBoundaryView title="Trade events unavailable" description="Trade event records could not be loaded. Try again, or return to the dashboard while the event data is checked." reset={reset} homeHref="/trade-events" homeLabel="Reload trade events" />; }
