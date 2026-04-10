// persistence key format anchor: dashboard:${workspace.organization.id}:${workspace.membership.id}:all
import { parseWorkspaceMode } from '@/features/workspace/mode';
import { renderDashboardPage } from './_lib/render-dashboard-page';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { mode?: string | string[] };
}) {
  const mode = parseWorkspaceMode(searchParams?.mode);
  return renderDashboardPage(mode);
}
