// persistence key format anchor: dashboard:${workspace.organization.id}:${workspace.membership.id}:all
import { DashboardSectionTabs } from '@/components/dashboard/dashboard-section-tabs';
import { StateMessage } from '@/components/ui/state-message';
import { parseWorkspaceMode } from '@/features/workspace/mode';
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
  const mode = parseWorkspaceMode(searchParams?.mode);
  const dashboard = await renderDashboardPage(mode);
  const notice = noticeMessage(searchParams?.notice);

  return (
    <>
      <DashboardSectionTabs active="home" />
      {notice ? <div className="mb-4"><StateMessage title={notice.title} description={notice.description} tone={notice.tone} /></div> : null}
      {dashboard}
    </>
  );
}
