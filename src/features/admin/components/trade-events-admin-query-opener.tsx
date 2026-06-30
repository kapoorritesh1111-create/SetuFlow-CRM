'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export function TradeEventsAdminQueryOpener() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const eventId = searchParams.get('eventId');
    if (!eventId) return;
    const nextHash = `#event-${eventId}`;
    if (window.location.hash === nextHash) return;
    window.location.hash = nextHash;
  }, [searchParams]);

  return null;
}
