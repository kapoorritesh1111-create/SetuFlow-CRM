import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { PipelineBoard } from '@/features/pipeline/components/pipeline-board';
import { parseWorkspaceMode, workspaceModeToLeadJourney } from '@/features/workspace/mode';
import { buildTodayLayerState } from '@/features/workspace/today';
import { normalizeQuoteRecords } from '@/lib/normalizers/quote-normalizer';
import { getLeadsPageData } from '@/lib/queries/leads';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';

export default async function PipelinePage({
  searchParams,
}: {
  searchParams?: { mode?: string | string[] };
}) {
  const workspace = await getWorkspaceAccess();

  if (!workspace.membership || !workspace.organization) {
    return (
      <WorkspaceState
        eyebrow="Pipeline workspace"
        title="Workspace membership needed"
        description="Your account is signed in, but no active organization membership could be loaded. Confirm the organization_members row is active for this user and points to the seeded workspace."
        primaryActionHref="/dashboard"
        primaryActionLabel="Go to dashboard"
      />
    );
  }

  const data = await getLeadsPageData(workspace.organization.id);

  if (!data) {
    return (
      <WorkspaceState
        eyebrow="Pipeline workspace"
        title="Pipeline will appear here"
        description="Connect Supabase and live pipeline stages will load from your workspace."
        primaryActionHref="/dashboard"
        primaryActionLabel="Back to dashboard"
      />
    );
  }

  const workspaceMode = parseWorkspaceMode(searchParams?.mode);
  const normalizedQuotes = normalizeQuoteRecords(data.quotes);
  const canManageLeads = hasWorkspaceCapability(workspace.currentRoles, 'lead.manage');
  const readOnlyMessage = getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage');
  const isWorkspaceEmpty = data.leads.length === 0;
  const isStageConfigurationEmpty = data.stages.length === 0 || data.pipelines.length === 0;
  const todayState = buildTodayLayerState({
    mode: workspaceMode,
    nowIso: new Date().toISOString(),
    leads: data.leads,
    activities: data.activities,
    complianceItems: data.complianceItems,
  });

  return (
    <div className="space-y-4">
      <QueryIssuesAlert issues={data.queryIssues} />
      <PipelineBoard
        currentUserId={workspace.user?.id ?? ''}
        canManageLeads={canManageLeads}
        readOnlyMessage={readOnlyMessage}
        isWorkspaceEmpty={isWorkspaceEmpty}
        isStageConfigurationEmpty={isStageConfigurationEmpty}
        stages={data.stages}
        leads={data.leads}
        pipelines={data.pipelines}
        nextSteps={data.nextSteps}
        tradeEvents={data.tradeEvents}
        productCategories={data.productCategories}
        products={data.products}
        markets={data.markets}
        profiles={data.profiles}
        countries={data.countries}
        leadMarkets={data.leadMarkets}
        leadProductInterests={data.leadProductInterests}
        followUps={data.followUps}
        activities={data.activities}
        stageHistory={data.stageHistory}
        rfqs={data.rfqs}
        quotes={normalizedQuotes}
        complianceItems={data.complianceItems}
        complianceDefinitions={data.complianceDefinitions}
        documents={data.documents}
        documentRequirementRules={data.documentRequirementRules}
        variants={data.variants}
        prices={data.prices}
        pricingRules={data.pricingRules}
        initialMode={workspaceMode}
        initialLeadType={workspaceModeToLeadJourney(workspaceMode)}
        initialTodayState={todayState}
      />
    </div>
  );
}
