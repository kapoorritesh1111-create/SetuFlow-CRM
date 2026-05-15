'use client';

import { useEffect, useState } from 'react';
import { InlineCoverageResolverRuntime } from '@/components/shell/InlineCoverageResolverRuntime';

function onLeadsPage() {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/leads');
}

export function LeadCoverageRecoveryBoundary() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const sync = () => setEnabled(onLeadsPage());
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  if (!enabled) return null;
  return <InlineCoverageResolverRuntime />;
}
