// UPDATED FILE
import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { StateMessage } from '@/components/ui/state-message';
import { LeadsWorkspace } from '@/features/leads/components/leads-workspace';
import { getLeadsPageData } from '@/lib/queries/leads';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { buildLeadsPageViewModel } from '@/features/leads/logic/build-leads-page-view-model';

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

  const viewModel = buildLeadsPageViewModel({ workspace, data, searchParams });

  return (
    <div className="space-y-4">
      <QueryIssuesAlert issues={data.queryIssues} />
      <StateMessage
        title={viewModel.workspaceMode === 'buyers'
          ? 'Buyer mode is active in Leads'
          : viewModel.workspaceMode === 'suppliers'
            ? 'Supplier mode is active in Leads'
            : 'Combined buyer and supplier view is active in Leads'}
        description={viewModel.workspaceMode === 'buyers'
          ? 'Keep the primary action on qualification and progression. The next commercial move is to open one lead, tighten details, and advance it toward Quote.'
          : viewModel.workspaceMode === 'suppliers'
            ? 'Keep the primary action on supplier qualification and coverage readiness. Move one supplier record forward rather than spreading attention across the board.'
            : 'This workspace mixes buyer and supplier records. Pick one priority record, open the command center, and move it cleanly through the locked flow.'}
        tone="neutral"
      />

      <LeadsWorkspace
        currentUserId={viewModel.currentUserId}
        canManageLeads={viewModel.canManageLeads}
        readOnlyMessage={viewModel.readOnlyMessage}
        isWorkspaceEmpty={viewModel.isWorkspaceEmpty}
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
        quotes={viewModel.normalizedQuotes}
        quoteVersions={data.quoteVersions}
        complianceItems={data.complianceItems}
        complianceDefinitions={data.complianceDefinitions}
        documents={data.documents}
        documentRequirementRules={data.documentRequirementRules}
        variants={data.variants}
        prices={data.prices} pricingRules={data.pricingRules}
        initialMode={viewModel.workspaceMode}
        initialLeadType={viewModel.initialLeadType}
        initialTodayState={viewModel.todayState}
      />
    </div>
  );
}
