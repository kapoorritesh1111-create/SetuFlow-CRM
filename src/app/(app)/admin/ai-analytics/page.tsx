import { redirect } from 'next/navigation';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { AdminAiAnalyticsWorkspace } from '@/features/admin/components/admin-ai-analytics-workspace';
import { AdminPageHero, AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { getAiAnalyticsData } from '@/lib/queries/ai-analytics';
import { canViewAuditLogs } from '@/lib/permissionGuards';
import { requireAdminWorkspace } from '@/lib/workspace/auth';

function parseWindow(value: string | string[] | undefined) {
  const first = Array.isArray(value) ? value[0] : value;
  const parsed = Number(first ?? 30);
  return Number.isFinite(parsed) ? parsed : 30;
}

export default async function AdminAiAnalyticsPage({
  searchParams,
}: {
  searchParams?: { window?: string | string[] };
}) {
  const { membership, organization, currentRoles, missingEnv } = await requireAdminWorkspace();
  if (missingEnv) {
    return <WorkspaceState eyebrow="AI analytics" title="AI analytics unavailable" description="Supabase environment variables are missing in this environment." primaryActionHref="/dashboard" primaryActionLabel="Return to dashboard" />;
  }
  if (!membership || !organization || !canViewAuditLogs(currentRoles)) {
    return <WorkspaceState eyebrow="AI analytics" title="Admin access needed" description="Only admin-capable workspace members can open the AI analytics dashboard." primaryActionHref="/dashboard" primaryActionLabel="Return to dashboard" />;
  }

  const internalOrgId = process.env.SETU_INTERNAL_ORG_ID;
  if (!internalOrgId || organization.id !== internalOrgId) redirect('/admin');

  const data = await getAiAnalyticsData(organization.id, parseWindow(searchParams?.window));
  if (!data) {
    return <WorkspaceState eyebrow="AI analytics" title="AI analytics unavailable" description="The AI analytics dashboard could not load because the data layer is unavailable in this environment." primaryActionHref="/dashboard" primaryActionLabel="Return to dashboard" />;
  }

  return <AdminSettingsShell active="ai-analytics" organizationName={organization.name} missingCount={0} sectionTitle="AI analytics"><AdminPageHero title="AI analytics" description="Review AI suggestion generation, review, approval, dismissal, and applied-action performance in the admin shell." badge={organization.name} stats={[{ label: 'Window', value: `${parseWindow(searchParams?.window)} days`, tone: 'info' }] as any} /><AdminAiAnalyticsWorkspace data={data} /></AdminSettingsShell>;
}
