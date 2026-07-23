// persistence key format anchor: dashboard:${workspace.organization.id}:${workspace.membership.id}:all
import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import { DashboardSectionTabs } from '@/components/dashboard/dashboard-section-tabs';
import { StateMessage } from '@/components/ui/state-message';
import {
  SetuGuruDashboardStrip,
  SetuGuruDashboardStripLoading,
} from '@/features/setu-guru/setu-guru-dashboard-strip';
import { parseWorkspaceMode } from '@/features/workspace/mode';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getPrimaryWorkspaceRole } from '@/lib/workspace/roles';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationVerticals } from '@/lib/verticals/capability';
import { renderDashboardPage } from './_lib/render-dashboard-page';

function noticeMessage(notice?: string | string[]) {
  const value = Array.isArray(notice) ? notice[0] : notice;
  if (value === 'invite-accepted') {
    return {
      title: 'Welcome — your workspace access is active',
      description: 'Password setup succeeded and your role is active. You are now inside the workspace dashboard.',
      tone: 'success' as const,
    };
  }
  return null;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { mode?: string | string[]; notice?: string | string[] };
}) {
  const rawMode = Array.isArray(searchParams?.mode) ? searchParams?.mode[0] : searchParams?.mode;
  const explicitAll = rawMode === 'all';
  const mode = parseWorkspaceMode(searchParams?.mode);

  // S27-STARK-A3: Design and Dispatch/Operations land on a role-specific home
  // view for packaging-enabled orgs, instead of the generic sales/exec
  // dashboard. ?mode=all always opts back into the generic dashboard.
  const workspace = await getWorkspaceAccess();
  if (!explicitAll && workspace.membership && workspace.organization) {
    const primaryRole = getPrimaryWorkspaceRole(workspace.currentRoles);
    if (primaryRole === 'design' || primaryRole === 'operations') {
      const supabase = await createClient();
      const verticals = await getOrganizationVerticals(workspace.organization.id, supabase);
      if (verticals.packagingEnabled) {
        redirect(primaryRole === 'design' ? '/design-queue' : '/dispatch-board');
      }
    }
  }

  const dashboard = await renderDashboardPage(mode, explicitAll);
  const notice = noticeMessage(searchParams?.notice);

  return (

    <>
      {/* Desktop-only: Reports isn't mobile-ready yet and this nav card is too
          tall for a phone screen — mobile navigation lives in the bottom tab bar. */}
      <div className="hidden md:block"><DashboardSectionTabs active="home" /></div>
      {notice ? <div className="mb-4"><StateMessage title={notice.title} description={notice.description} tone={notice.tone} /></div> : null}
      {workspace.organization?.id ? (
        <Suspense fallback={<SetuGuruDashboardStripLoading />}>
          <SetuGuruDashboardStrip organizationId={workspace.organization.id} />
        </Suspense>
      ) : null}
      {dashboard}
    </>
  );
}
