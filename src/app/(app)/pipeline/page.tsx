import dynamic from 'next/dynamic';
import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { buildPipelinePageViewModel } from '@/features/pipeline/logic/build-pipeline-page-view-model';
import { getPipelinePageData } from '@/lib/queries/pipeline';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { SetuFilterBar, SetuStatsStrip, SetuTopbarActions, SetuWorkspaceShell } from '@/components/setu-shell';

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
  const openLeads = data.leads.length;
  const buyerLeads = data.leads.filter((lead) => lead.lead_type === 'buyer').length;
  const supplierLeads = data.leads.filter((lead) => lead.lead_type === 'supplier').length;
  const quoteReady = pipelineView.normalizedQuotes.filter((quote) => ['approved', 'sent', 'accepted'].includes(String(quote.status))).length;
  const overdueFollowUps = data.followUps.filter((item) => item.scheduled_at && new Date(item.scheduled_at).getTime() < Date.now() && item.status !== 'completed').length;

  return (
    <SetuWorkspaceShell>
      <SetuTopbarActions eyebrow="Revenue pipeline" title="Pipeline Command Board" section={workspace.organization.name} actions={[{ label: 'All', href: '/pipeline?mode=all', active: pipelineView.workspaceMode === 'all' },{ label: 'Buyers', href: '/pipeline?mode=buyers', active: pipelineView.workspaceMode === 'buyers' },{ label: 'Suppliers', href: '/pipeline?mode=suppliers', active: pipelineView.workspaceMode === 'suppliers' },{ label: '+ New lead', href: PRODUCT_ROUTES.app.leads, variant: 'primary' }]} />
      <SetuFilterBar meta={`${data.leads.length} leads - ${data.stages.length} stages`}><span style={{fontSize:'12px',fontWeight:800,color:'#0f172a'}}>Compact board filters</span><span style={{fontSize:'11px',color:'#64748b'}}>Search, owner, product, and market filters remain available inside the board.</span></SetuFilterBar>
      <SetuStatsStrip stats={[{ label: 'Open leads', value: openLeads, meta: 'Board visible below', accent: '#0c7fff' },{ label: 'Buyer lanes', value: buyerLeads, meta: 'Import demand', accent: '#059669' },{ label: 'Supplier lanes', value: supplierLeads, meta: 'Source supply', accent: '#7c3aed' },{ label: 'Follow-ups due', value: overdueFollowUps, meta: 'Needs action', accent: overdueFollowUps ? '#dc2626' : '#cbd5e1' },{ label: 'Quote ready', value: quoteReady, meta: 'Commercial handoff', accent: '#d97706' },{ label: 'Stages', value: data.stages.length, meta: isStageConfigurationEmpty ? 'Setup needed' : 'Configured', accent: isStageConfigurationEmpty ? '#dc2626' : '#059669' }]} />
      <div style={{padding:'14px 0 40px',display:'flex',flexDirection:'column',gap:'14px'}}>
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
    </SetuWorkspaceShell>
  );
}
