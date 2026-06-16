import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { getWorkspaceAccess, isSetuInternalOrganization } from '@/lib/workspace/auth';
import { SmcShell } from './smc-shell';
import type { ReactNode } from 'react';
import './smc.css';
import './smc-s27.css';
import './smc-premium.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'SMC — Setu Mission Control',
  description: 'Internal operations workspace for SETU Flow',
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

  return (
    <div className="smc-root">
      <SmcShell>{children}</SmcShell>
    </div>
  );
}
