'use client';

import { RoleAwareLeadList } from '@/features/mobile/components/role-aware-lead-list';
import type { MobileLeadType } from '@/features/mobile/lib/role-aware-leads';

type LeadsMobileSurfaceProps = {
  initialLeadType: MobileLeadType;
  leads: any[];
  user: any;
  signedIn: any;
};

/**
 * The canonical /leads mobile surface always stays as the lead list.
 * Quick Lead is owned by LeadsWorkspace/LeadDrawer, whose portal becomes the
 * single full-screen mobile capture surface. Keeping a second mobile scanner
 * mounted here caused event Capture Lead to open two overlapping windows.
 */
export function LeadsMobileSurface({
  initialLeadType,
  leads,
  user,
  signedIn,
}: LeadsMobileSurfaceProps) {
  return (
    <RoleAwareLeadList
      leads={leads}
      user={user}
      signedIn={signedIn}
      allowRolePreview={false}
      initialLeadType={initialLeadType}
    />
  );
}
