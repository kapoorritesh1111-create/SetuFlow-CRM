import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { getWorkspaceAccess, isSetuInternalOrganization } from '@/lib/workspace/auth';
import { getInitials } from '@/lib/utils';
import { SmcShell } from './smc-shell';
import { SmcMobileTabs } from './smc-mobile-tabs';
import type { ReactNode } from 'react';
import './smc.css';
import './smc-s27.css';
import './smc-premium.css';
import './smc-settings-polish.css';
import './smc-mobile.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'SMC — Setu Mission Control',
  description: 'Internal operations workspace for SETU Flow',
  manifest: '/smc.webmanifest',
  appleWebApp: { title: 'SETU Flow SMC' },
};

export default async function SmcLayout({ children }: { children: ReactNode }) {
  noStore();
  const workspace = await getWorkspaceAccess();

  if (!workspace.user || !workspace.organization || !workspace.membership) {
    redirect('/login?next=/smc');
  }

  if (!isSetuInternalOrganization(workspace.organization)) {
    redirect('/dashboard');
  }

  const displayName = workspace.profile?.full_name ?? workspace.profile?.username ?? 'SETU Flow user';
  const orgName = workspace.organization?.name ?? 'SETU Flow';

  return (
    <div className="smc-root">
      <SmcShell>{children}</SmcShell>
      <SmcMobileTabs
        userName={displayName}
        initials={getInitials(displayName)}
        orgName={orgName}
        roleLabel="HQ"
        userId={workspace.user?.id ?? ''}
      />
    </div>
  );
}
