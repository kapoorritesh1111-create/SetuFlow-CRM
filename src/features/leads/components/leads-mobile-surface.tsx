'use client';

import { useEffect, useState } from 'react';
import { RoleAwareLeadList } from '@/features/mobile/components/role-aware-lead-list';
import { MobileBusinessCardScanner } from '@/features/mobile/components/mobile-business-card-scanner';

type LeadsMobileSurfaceProps = {
  quickLeadEnabled: boolean;
  initialLeadType: 'buyer' | 'supplier';
  eventId: string | null;
  leads: any[];
  user: any;
  signedIn: any;
};

export function LeadsMobileSurface({
  quickLeadEnabled,
  initialLeadType,
  eventId,
  leads,
  user,
  signedIn,
}: LeadsMobileSurfaceProps) {
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobileViewport(query.matches);
    sync();
    query.addEventListener?.('change', sync);
    return () => query.removeEventListener?.('change', sync);
  }, []);

  if (quickLeadEnabled && isMobileViewport) {
    return <MobileBusinessCardScanner initialLeadType={initialLeadType} eventId={eventId} />;
  }

  if (quickLeadEnabled && !isMobileViewport) {
    return null;
  }

  return <RoleAwareLeadList leads={leads} user={user} signedIn={signedIn} allowRolePreview={false} />;
}
