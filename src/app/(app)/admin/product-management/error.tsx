'use client';
import { useEffect } from 'react';
import { ErrorBoundaryView } from '@/components/app/error-boundary-view';
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { useEffect(() => { console.error('Admin product management route error:', error); }, [error]); return <ErrorBoundaryView title="Product management unavailable" description="The admin product system of record failed to load. Try again, or return after checking catalog access and pricing readiness." reset={reset} homeHref="/admin/product-management" homeLabel="Reload product management" />; }
