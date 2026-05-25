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
    <div className="space-y-4">
      <QueryIssuesAlert issues={data.queryIssues} />
      <section className="rounded-[1.4rem] border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-slate-50 p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-blue-600">Deal management view</p>
            <h1 className="text-lg font-black tracking-tight text-slate-950">Pipeline manages stage movement, deal value, and quote-ready actions.</h1>
            <p className="text-sm leading-6 text-slate-600">
              Use Pipeline when you need a revenue and workflow view of the same lead records: stage lanes, blockers, follow-up pressure, and per-stage pipeline value. Use Leads when you need contact details, product interests, qualification notes, or profile cleanup.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <a
              href={PRODUCT_ROUTES.app.leads}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-700"
            >
              Open Leads contact view
            </a>
            <a
              href={PRODUCT_ROUTES.app.quotes}
              className="rounded-full bg-slate-950 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800"
            >
              Convert deal to quote
            </a>
          </div>
        </div>
      </section>
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
