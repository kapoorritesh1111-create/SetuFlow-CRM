// persistence key format anchor: dashboard:${workspace.organization.id}:${workspace.membership.id}:all
import { DashboardSectionTabs } from '@/components/dashboard/dashboard-section-tabs';
import { parseWorkspaceMode } from '@/features/workspace/mode';
import { renderDashboardPage } from './_lib/render-dashboard-page';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { mode?: string | string[] };
}) {
  const mode = parseWorkspaceMode(searchParams?.mode);
  const dashboard = await renderDashboardPage(mode);

  return (
    <>
      <DashboardSectionTabs active="home" />
      {dashboard}
    </>
  );
}
