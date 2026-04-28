import dynamic from 'next/dynamic';
import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { buildPipelinePageViewModel } from '@/features/pipeline/logic/build-pipeline-page-view-model';
import { getPipelinePageData } from '@/lib/queries/pipeline';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

const PipelineBoard = dynamic(
  () => import('@/features/pipeline/components/pipeline-board').then((mod) => mod.PipelineBoard),
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

  const pipelineView = buildPipelinePageViewModel({
    searchMode: searchParams?.mode,
    workspaceCurrentRoles: workspace.currentRoles,
    leads: data.leads,
    activities: data.activities,
    complianceItems: data.complianceItems,
    quotes: data.quotes,
  });
  const isWorkspaceEmpty = data.leads.length === 0;
  const isStageConfigurationEmpty = data.stages.length === 0 || data.pipelines.length === 0;

  return (
    <div style={{ margin: '-16px -24px -16px', background: 'var(--page-bg)', minHeight: 'calc(100vh - 56px)' }}>
      <QueryIssuesAlert issues={data.queryIssues} />
      <PipelineBoard
        currentUserId={workspace.user?.id ?? ''}
        canManageLeads={pipelineView.canManageLeads}
        readOnlyMessage={pipelineView.readOnlyMessage}
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
        quotes={pipelineView.normalizedQuotes}
        complianceItems={data.complianceItems}
        complianceDefinitions={data.complianceDefinitions}
        documents={data.documents}
        documentRequirementRules={data.documentRequirementRules}
        variants={data.variants}
        prices={data.prices}
        pricingRules={data.pricingRules}
        initialMode={pipelineView.workspaceMode}
        initialLeadType={pipelineView.initialLeadType}
        initialTodayState={pipelineView.todayState}
      />
    </div>
  );
}
