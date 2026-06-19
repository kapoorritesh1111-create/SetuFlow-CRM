import { redirect } from 'next/navigation';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { AdminAiAnalyticsWorkspace } from '@/features/admin/components/admin-ai-analytics-workspace';
import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { KitInternalHeader } from '@/features/admin/components/admin-ui-kit';
import { getAiAnalyticsData } from '@/lib/queries/ai-analytics';
import { canViewAuditLogs } from '@/lib/permissionGuards';
import { requireSetuInternalAdminWorkspace } from '@/lib/workspace/auth';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

const SETU_FLOW_INTERNAL_ORG_ID = INTERNAL_ORG_ID;

function isInternalOrg(organizationId: string) {
  const configuredInternalOrgId = process.env.SETU_INTERNAL_ORG_ID?.trim();
  return organizationId === configuredInternalOrgId || organizationId === SETU_FLOW_INTERNAL_ORG_ID;
}

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
  const { membership, organization, currentRoles, missingEnv } = await requireSetuInternalAdminWorkspace();
  if (missingEnv) {
    return <WorkspaceState eyebrow="AI analytics" title="AI analytics unavailable" description="Supabase environment variables are missing in this environment." primaryActionHref="/dashboard" primaryActionLabel="Return to dashboard" />;
  }
  if (!membership || !organization || !canViewAuditLogs(currentRoles)) {
    return <WorkspaceState eyebrow="AI analytics" title="Admin access needed" description="Only admin-capable workspace members can open the AI analytics dashboard." primaryActionHref="/dashboard" primaryActionLabel="Return to dashboard" />;
  }

  if (!isInternalOrg(organization.id)) redirect('/admin');

  const data = await getAiAnalyticsData(organization.id, parseWindow(searchParams?.window));
  if (!data) {
    return <WorkspaceState eyebrow="AI analytics" title="AI analytics unavailable" description="The AI analytics dashboard could not load because the data layer is unavailable in this environment." primaryActionHref="/dashboard" primaryActionLabel="Return to dashboard" />;
  }

  return <AdminSettingsShell active="ai-analytics" organizationName={organization.name} internalTools missingCount={0} sectionTitle="AI analytics"><KitInternalHeader icon="📈" title="AI Analytics" description="Setu Guru suggestion generation, acceptance, dismissal, and applied-action rates across the whole platform." gradientClass="from-[#0c4a6e] to-[#075985]" /><AdminAiAnalyticsWorkspace data={data} /></AdminSettingsShell>;
}
