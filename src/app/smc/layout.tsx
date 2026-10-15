import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { getWorkspaceAccess, isSetuInternalOrganization } from '@/lib/workspace/auth';
import { getInitials } from '@/lib/utils';
import { SmcShell } from './smc-shell';
import { SmcMobileTabs } from './smc-mobile-tabs';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import './smc.css';
import './smc-s27.css';
import './smc-premium.css';
import './smc-settings-polish.css';
import './smc-mobile.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  applicationName: 'SETU SMC',
  title: 'SMC — Setu Mission Control',
  description: 'Internal operations workspace for SETU Flow',
  manifest: '/smc.webmanifest',
  appleWebApp: { capable: true, title: 'SETU SMC', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [{ url: '/api/smc/pwa-icon?size=192', type: 'image/png', sizes: '192x192' }],
    apple: [{ url: '/api/smc/pwa-icon?size=180', type: 'image/png', sizes: '180x180' }],
    shortcut: ['/api/smc/pwa-icon?size=192'],
  },
};

export default async function SmcLayout({ children }: { children: ReactNode }) {
  noStore();
  const workspace = await getWorkspaceAccess();

  if (!workspace.user || !workspace.organization || !workspace.membership) {
    redirect('/login');
  }

  if (!isSetuInternalOrganization(workspace.organization)) {
    redirect('/dashboard');
  }

  const displayName = workspace.profile?.full_name ?? workspace.profile?.username ?? 'SETU Flow user';
  const orgName = workspace.organization?.name ?? 'SETU Flow';

  return (
    <div className="smc-root">
      <SmcShell userId={workspace.user.id} userName={displayName}>{children}</SmcShell>
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
