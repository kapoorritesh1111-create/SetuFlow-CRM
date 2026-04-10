'use client';
import { useEffect } from 'react';
import { ErrorBoundaryView } from '@/components/app/error-boundary-view';
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void; }) { useEffect(() => { console.error('Admin users route error:', error); }, [error]); return <ErrorBoundaryView title="Workspace users unavailable" description="The users workspace failed to load. Try again, or return to the dashboard while the user directory is checked." reset={reset} homeHref="/admin/users" homeLabel="Reload users" />; }
