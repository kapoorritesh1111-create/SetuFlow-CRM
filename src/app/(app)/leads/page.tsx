// UPDATED FILE
import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { LeadsWorkspace } from '@/features/leads/components/leads-workspace';
import { getLeadsPageData } from '@/lib/queries/leads';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { buildLeadsPageViewModel } from '@/features/leads/logic/build-leads-page-view-model';

export default async function LeadsPage({
  searchParams,
}: {
  searchParams?: {
    mode?: string | string[];
    quickLead?: string | string[];
    sourceType?: string | string[];
    sourceLabel?: string | string[];
    productId?: string | string[];
    autoQuote?: string | string[];
    handoff?: string | string[];
    tradeEventId?: string | string[];
  };
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


  const readParam = (value?: string | string[]) => Array.isArray(value) ? value[0] ?? '' : value ?? '';
  const quickLeadEnabled = ['1', 'true', 'yes'].includes(readParam(searchParams?.quickLead).toLowerCase());
  const quickLeadProductId = readParam(searchParams?.productId).trim();
  const quickLeadTradeEventId = readParam(searchParams?.tradeEventId).trim();
  const quickLeadTradeEvent = quickLeadTradeEventId ? data.tradeEvents.find((event) => event.id === quickLeadTradeEventId) : null;
  const quickLeadDefaults = quickLeadTradeEvent?.capture_defaults && typeof quickLeadTradeEvent.capture_defaults === 'object' ? quickLeadTradeEvent.capture_defaults : null;
  const handoff = readParam(searchParams?.handoff).trim();
  const handoffMessage = handoff === 'dashboard-overdue' || handoff === 'dashboard-open-follow-up' ? { title: 'Overview sent you into Follow-up', description: 'Your active mode and next working lane were preserved. Open one priority lead and clear the real blocker.' } : handoff === 'capture-converted' ? { title: 'Capture converted into Follow-up', description: 'The lead is live now. Stay in Follow-up to qualify it, then move into Quote only when the commercial path is ready.' } : null;

  const initialQuickCapture = quickLeadEnabled
    ? {
        sourceType: quickLeadTradeEvent ? 'trade_event' : readParam(searchParams?.sourceType).trim() || 'trade_show',
        sourceLabel: readParam(searchParams?.sourceLabel).trim() || quickLeadTradeEvent?.name || 'Trade show fast lane',
        tradeEventId: quickLeadTradeEventId || undefined,
        defaultProductLabel: typeof quickLeadDefaults?.default_product_label === 'string' ? quickLeadDefaults.default_product_label : undefined,
        defaultLeadType: quickLeadDefaults?.default_lead_type === 'buyer' || quickLeadDefaults?.default_lead_type === 'supplier' ? quickLeadDefaults.default_lead_type : undefined,
        selectedProductIds: quickLeadProductId ? [quickLeadProductId] : [],
        autoOpenQuoteAfterSave: ['1', 'true', 'yes'].includes(readParam(searchParams?.autoQuote).toLowerCase()),
        title: 'Trade-show quick lead',
        description: 'Capture the minimum buyer context, keep the product lane pre-linked, and move into Quote faster.',
      }
    : null;


  return (
    <div className="space-y-4">
      <QueryIssuesAlert issues={data.queryIssues} />
      {handoffMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="font-semibold">{handoffMessage.title}</p>
          <p className="mt-1">{handoffMessage.description}</p>
        </div>
      ) : null}

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
        initialQuickCapture={initialQuickCapture}
      />
    </div>
  );
}
