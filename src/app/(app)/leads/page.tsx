// UPDATED FILE
import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { LeadsWorkspace } from '@/features/leads/components/leads-workspace';
import { parseWorkspaceMode, workspaceModeToLeadJourney } from '@/features/workspace/mode';
import { buildTodayLayerState } from '@/features/workspace/today';
import { getLeadsPageData } from '@/lib/queries/leads';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { normalizeQuoteRecords } from '@/lib/normalizers/quote-normalizer';

export default async function LeadsPage({
  searchParams,
}: {
  searchParams?: { mode?: string | string[] };
}) {
  const workspace = await getWorkspaceAccess();

  if (!workspace.membership || !workspace.organization) {
    return (
      <WorkspaceState
        eyebrow="Leads workspace"
        title="Workspace membership needed"
        description="Your account is signed in, but no active organization membership could be loaded. Confirm the organization_members row is active for this user and points to the seeded workspace."
        primaryActionHref={PRODUCT_ROUTES.app.dashboard}
        primaryActionLabel="Go to dashboard"
      />
    );
  }

  const data = await getLeadsPageData(workspace.organization.id);

  if (!data) {
    return (
      <WorkspaceState
        eyebrow="Leads workspace"
        title="Leads will appear here"
        description="Connect Supabase and your live lead table will render in this workspace."
        primaryActionHref={PRODUCT_ROUTES.app.dashboard}
        primaryActionLabel="Back to dashboard"
      />
    );
  }

  const normalizedQuotes = normalizeQuoteRecords(data.quotes);
  const canManageLeads = hasWorkspaceCapability(workspace.currentRoles, 'lead.manage');
  const readOnlyMessage = getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage');
  const isWorkspaceEmpty = data.leads.length === 0;
  const workspaceMode = parseWorkspaceMode(searchParams?.mode);
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

      <LeadsWorkspace
        currentUserId={workspace.user?.id ?? ''}
        canManageLeads={canManageLeads}
        readOnlyMessage={readOnlyMessage}
        isWorkspaceEmpty={isWorkspaceEmpty}
        leads={data.leads.map((lead) => ({ ...lead, intro_sent: lead.intro_sent ?? false }))}
        stages={data.stages}
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
        quoteVersions={data.quoteVersions}
        complianceItems={data.complianceItems}
        complianceDefinitions={data.complianceDefinitions}
        documents={data.documents}
        documentRequirementRules={data.documentRequirementRules}
        variants={data.variants}
        prices={data.prices} pricingRules={data.pricingRules}
        initialMode={workspaceMode}
        initialLeadType={workspaceModeToLeadJourney(workspaceMode)}
        initialTodayState={todayState}
      />
    </div>
  );
}
