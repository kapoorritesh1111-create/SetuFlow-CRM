import type { ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';
import { MobileShell } from '@/features/mobile/components/mobile-shell';
import { isMobileAppV1Enabled } from '@/features/mobile/lib/mobile-feature-flag';
import { getInitials } from '@/lib/utils';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getPrimaryWorkspaceRole, getWorkspaceRoleDisplayName, normalizeWorkspaceRoles } from '@/lib/workspace/roles';

export const metadata = { title: 'SETU Flow Mobile' };

export default async function MobileLayout({ children }: { children: ReactNode }) {
  if (!isMobileAppV1Enabled()) notFound();

  const workspace = await getWorkspaceAccess();
  // Never render anonymous preview pages as though they were a CRM workspace.
  if (!workspace.user) redirect('/client-login?next=%2Fmobile');
  if (!workspace.organization || !workspace.membership) redirect('/dashboard');
  const displayName = workspace.profile?.full_name ?? workspace.profile?.username ?? 'SETU Flow user';
  const normalizedRoles = normalizeWorkspaceRoles(workspace.currentRoles);
  const currentRole = getPrimaryWorkspaceRole(normalizedRoles) ?? 'member';

  return (
    <MobileShell
      signedIn={{
        name: displayName,
        initials: getInitials(displayName),
        email: workspace.profile?.email ?? workspace.user?.email ?? null,
        organizationName: workspace.organization?.name ?? 'SETU Flow',
        roleLabel: getWorkspaceRoleDisplayName(currentRole),
        avatarUrl: workspace.profile?.avatar_url ?? null,
        shareHref: '/card',
      }}
    >
      {children}
    </MobileShell>
  );
}
