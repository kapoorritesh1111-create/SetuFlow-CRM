import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/server';
import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { buildPipelinePageViewModel } from '@/features/pipeline/logic/build-pipeline-page-view-model';
import { getPipelinePageData } from '@/lib/queries/pipeline';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

const PipelineBoardViewShell = dynamic(
  () => import('@/features/pipeline/components/PipelineBoardViewShell').then((mod) => mod.PipelineBoardViewShell),
  {
    ssr: false,
    loading: () => null,
  },
);

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
        primaryActionHref={PRODUCT_ROUTES.app.dashboard}
        primaryActionLabel="Go to dashboard"
      />
    );
  }

  const data = await getPipelinePageData(workspace.organization.id);
  // Resolve procurement entitlement for the actual organization, even for support users.
  // Navigation grants alone must never broaden the customer's pipeline data.
  const supabase = await createClient();
  const { data: supplierGrant } = await supabase.from('org_module_grants')
    .select('enabled')
    .eq('organization_id', workspace.organization.id)
    .eq('module_key', 'supplier_procurement')
    .maybeSingle();
  const supplierEnabled = (supplierGrant as { enabled: boolean } | null)?.enabled === true;

  if (!data) {
    return (
      <WorkspaceState
        eyebrow="Pipeline workspace"
        title="Pipeline will appear here"
        description="Connect Supabase and live pipeline stages will load from your workspace."
        primaryActionHref={PRODUCT_ROUTES.app.dashboard}
        primaryActionLabel="Back to dashboard"
      />
    );
  }

  const visiblePipelines = supplierEnabled ? data.pipelines : data.pipelines.filter((p) => p.lead_type !== 'supplier');
  const visiblePipelineIds = new Set(visiblePipelines.map((p) => p.id));
  const visibleStages = data.stages.filter((stage) => visiblePipelineIds.has(stage.pipeline_id) &&
    (supplierEnabled || !/supplier/i.test(stage.name)));
  const visibleLeads = data.leads.filter((lead) => (supplierEnabled || lead.lead_type !== 'supplier') &&
    (!lead.pipeline_id || visiblePipelineIds.has(lead.pipeline_id)));
  const pipelineView = buildPipelinePageViewModel({
    searchMode: searchParams?.mode,
    workspaceCurrentRoles: workspace.currentRoles,
    leads: visibleLeads,
    activities: data.activities,
    complianceItems: data.complianceItems,
    quotes: data.quotes,
  });
  const isWorkspaceEmpty = visibleLeads.length === 0;
  const isStageConfigurationEmpty = visibleStages.length === 0 || visiblePipelines.length === 0;

  return (
    <div className="space-y-4">
      <QueryIssuesAlert issues={data.queryIssues} />
      <PipelineBoardViewShell
        currentUserId={workspace.user?.id ?? ''}
        canManageLeads={pipelineView.canManageLeads}
        readOnlyMessage={pipelineView.readOnlyMessage}
        isWorkspaceEmpty={isWorkspaceEmpty}
        isStageConfigurationEmpty={isStageConfigurationEmpty}
        stages={visibleStages}
        leads={visibleLeads}
        pipelines={visiblePipelines}
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
        quotes={pipelineView.normalizedQuotes}
        complianceItems={data.complianceItems}
        complianceDefinitions={data.complianceDefinitions}
        documents={data.documents}
        documentRequirementRules={data.documentRequirementRules}
        variants={data.variants}
        prices={data.prices}
        pricingRules={data.pricingRules}
        supplierEnabled={supplierEnabled}
        initialMode={supplierEnabled ? pipelineView.workspaceMode : pipelineView.workspaceMode === 'suppliers' ? 'buyers' : pipelineView.workspaceMode}
        initialLeadType={supplierEnabled ? pipelineView.initialLeadType : 'buyer'}
        initialTodayState={pipelineView.todayState}
      />
    </div>
  );
}
