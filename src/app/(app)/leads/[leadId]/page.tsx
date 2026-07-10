import { EmptyState } from '@/components/ui/empty-state';
import { hasSupabaseEnv } from '@/lib/env';
import { getLeadProfileData } from '@/lib/queries/leads';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import LeadCommandCenterPremium from '@/features/leads/canonical/LeadCommandCenterPremium';
import WorkflowToast from '@/features/leads/canonical/WorkflowToast';
import { ResearchDrawerLauncher } from '@/features/setu-guru/research-drawer';
import { OutreachGeneratorLauncher } from '@/features/setu-guru/outreach-generator-panel';
import { ReplyAnalyzerLauncher } from '@/features/setu-guru/reply-analyzer-modal';
import { QuoteAssistantLauncher } from '@/features/setu-guru/quote-assistant-panel';
import { SupplierRfqAssistantLauncher } from '@/features/setu-guru/supplier-rfq-assistant-panel';

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function leadsBackHref(value?: string | string[]) {
  const mode = readParam(value).trim();
  return mode ? `/leads?mode=${encodeURIComponent(mode)}` : '/leads';
}

function savedMessage(value?: string | string[]) {
  const saved = readParam(value).trim();
  if (saved === 'lead') return 'Lead details saved.';
  if (saved === 'follow-up') return 'Follow-up updated.';
  if (saved === 'qualification') return 'Qualification and mapping saved.';
  if (saved === 'stage') return 'Lead stage updated.';
  if (saved === 'owner') return 'Lead owner reassigned.';
  return '';
}

export default async function Page({
  params,
  searchParams,
}: {
  params: { leadId: string };
  searchParams?: { saved?: string | string[]; stageError?: string | string[]; mode?: string | string[] };
}) {
  let workspace: Awaited<ReturnType<typeof getWorkspaceAccess>> | null = null;
  try {
    workspace = await getWorkspaceAccess();
  } catch {
    return <EmptyState title="Workspace unavailable" description="We were unable to load your workspace. Please refresh or try again later." />;
  }

  if (!hasSupabaseEnv || workspace?.missingEnv) {
    return <EmptyState title="Configuration required" description="SETU Flow needs Supabase environment values in the current environment." />;
  }

  if (!workspace?.membership || !workspace?.organization) {
    return <EmptyState title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded." />;
  }

  const data = await getLeadProfileData(workspace.organization.id, params.leadId);
  if (!data?.lead) {
    return <EmptyState title="Lead not found" description="The requested lead could not be loaded from the active workspace." />;
  }

  const toastMessage = savedMessage(searchParams?.saved);
  const hasStageError = Boolean(readParam(searchParams?.stageError).trim());
  const teamMembers = data.profiles.map((profile: any) => ({
    id: profile.id,
    name: profile.full_name || profile.username || 'Team member',
  }));

  return (
    <>
      {toastMessage ? <WorkflowToast kind="success" message={toastMessage} /> : null}
      {hasStageError ? <WorkflowToast kind="warning" message="Lead action needs attention. Please refresh and try again." /> : null}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        <ResearchDrawerLauncher leadId={data.lead.id} leadType={data.lead.lead_type} />
        <OutreachGeneratorLauncher leadId={data.lead.id} />
        <ReplyAnalyzerLauncher leadId={data.lead.id} />
        {String(data.lead.lead_type ?? '').toLowerCase() === 'supplier' ? (
          <SupplierRfqAssistantLauncher leadId={data.lead.id} />
        ) : (
          <QuoteAssistantLauncher leadId={data.lead.id} />
        )}
      </div>
      <LeadCommandCenterPremium
        data={data}
        canReassignOwner={workspace.canAccessAdmin}
        teamMembers={teamMembers}
        backHref={leadsBackHref(searchParams?.mode)}
      />
    </>
  );
}
