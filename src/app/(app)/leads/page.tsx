import Link from 'next/link';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { LeadsWorkspace } from '@/features/leads/components/leads-workspace';
import { LeadEventFilterNarrower } from '@/features/leads/components/lead-event-filter-narrower';
import { LeadsMobileSurface } from '@/features/leads/components/leads-mobile-surface';
import { QuoteReviewInlineComplianceFix } from '@/features/leads/components/quote-review-inline-compliance-fix';
import { getLeadsPageData } from '@/lib/queries/leads';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getTrialCapability } from '@/lib/trial/capability';
import { TrialBlockedNotice } from '@/components/ui/trial-blocked-notice';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { buildLeadsPageViewModel } from '@/features/leads/logic/build-leads-page-view-model';
import { buildMobileLeadCardsFromAppData, buildMobileSignedInSummary, buildMobileUserContextFromWorkspace } from '@/features/mobile/lib/app-mobile-leads';
import type { MobileLeadType } from '@/features/mobile/lib/role-aware-leads';
import { redirect } from 'next/navigation';

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function readModeLeadType(value?: string | string[]): MobileLeadType {
  const mode = readParam(value);
  if (mode === 'buyers' || mode === 'buyer') return 'buyer';
  if (mode === 'suppliers' || mode === 'supplier') return 'supplier';
  return '';
}

function readRequestedLeadType(value?: string | string[]): MobileLeadType {
  const leadType = readParam(value).toLowerCase();
  if (leadType === 'buyer' || leadType === 'supplier') return leadType;
  return '';
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams?: {
    mode?: string | string[];
    leadType?: string | string[];
    quickLead?: string | string[];
    sourceType?: string | string[];
    sourceLabel?: string | string[];
    productId?: string | string[];
    autoQuote?: string | string[];
    handoff?: string | string[];
    eventId?: string | string[];
    leadId?: string | string[];
    view?: string | string[];
    quoteId?: string | string[];
  };
}) {
  const requestedLeadId = readParam(searchParams?.leadId).trim();
  const requestedView = readParam(searchParams?.view).trim();
  // S37 CANONICAL WORKFLOW: nested /leads?leadId=&view=* surfaces are deprecated.
  // Keep this redirect while old links are being removed from the repo, but route users to the
  // single canonical Lead Detail or Quote Builder path.
  if (requestedLeadId && requestedView) {
    const legacyParams = new URLSearchParams();
    const requestedQuoteId = readParam(searchParams?.quoteId).trim();
    const requestedHandoff = readParam(searchParams?.handoff).trim();
    if (requestedQuoteId) legacyParams.set('quoteId', requestedQuoteId);
    if (requestedHandoff) legacyParams.set('handoff', requestedHandoff);
    const legacyQuery = legacyParams.toString();
    redirect(requestedView === 'quote' ? `/leads/${requestedLeadId}/quote${legacyQuery ? `?${legacyQuery}` : ''}` : `/leads/${requestedLeadId}${legacyQuery ? `?${legacyQuery}` : ''}`);
  }

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

  const { capability: trialCapability } = await getTrialCapability(workspace.organization.id);
  const guidedTrialCoach = Boolean(trialCapability?.is_trial && trialCapability.guided_mode_enabled);
  const trialLeadLimitReached = Boolean(
    guidedTrialCoach && trialCapability && trialCapability.remaining_leads !== null && trialCapability.remaining_leads <= 0,
  );

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

  // An event-origin link must always initialize Quick Add, even if an older event card omits quickLead=1.
  const eventId = readParam(searchParams?.eventId).trim();
  const quickLeadEnabled = ['1', 'true', 'yes'].includes(readParam(searchParams?.quickLead).toLowerCase()) || Boolean(eventId);
  const quickLeadProductId = readParam(searchParams?.productId).trim();
  const requestedSourceType = readParam(searchParams?.sourceType).trim();
  const requestedSourceLabel = readParam(searchParams?.sourceLabel).trim();
  // Event capture must remain reliable even if a deep link omits the display label.
  const selectedTradeEvent = data.tradeEvents.find((event) => String(event.id) === eventId);
  const eventSourceLabel = requestedSourceLabel || String(selectedTradeEvent?.name ?? '').trim();
  const modeLeadType = readModeLeadType(searchParams?.mode);
  const requestedLeadType = readRequestedLeadType(searchParams?.leadType);
  const quickLeadType: 'buyer' | 'supplier' = requestedLeadType || modeLeadType || (requestedSourceType === 'supplier' ? 'supplier' : 'buyer');
  const isStarkPackmate = workspace.organization.id === 'b97913cb-3b95-4247-8ced-ffdc0d392d2a' || String(workspace.organization.slug ?? '').toLowerCase() === 'starkpackmate';
  const normalizedRoles = workspace.currentRoles.map((role) => String(role).toLowerCase());
  const canAccessStarkInbound = workspace.canAccessAdmin || normalizedRoles.includes('sales');
  const canManageStarkInboundAssignments = normalizedRoles.some((role) => ['owner', 'manager', 'admin'].includes(role));

  const canDelegateLeads = workspace.currentRoles.some(role => ['owner', 'admin', 'manager', 'sales', 'sales_coordinator'].includes(role));
  const coordinationClient = createAdminSupabaseClient();
  const { data: coordinationRows } = coordinationClient && canDelegateLeads
    ? await (coordinationClient as any).from('leads').select('id,coordinator_user_id').eq('organization_id', workspace.organization.id)
    : { data: [] };
  const coordinatorAssignments: Record<string,string|null> = {};
  const exposedLeadIds = new Set(data.leads.map(lead => lead.id));
  for (const row of coordinationRows ?? []) {
    if (exposedLeadIds.has(row.id)) coordinatorAssignments[row.id] = row.coordinator_user_id ?? null;
  }
  // Never send assignment metadata for unrelated leads to a sales browser.

  const mobileLeadCards = buildMobileLeadCardsFromAppData(data as any);
  const mobileUser = buildMobileUserContextFromWorkspace(workspace as any);
  const mobileSignedIn = await buildMobileSignedInSummary(workspace as any);

  const initialQuickCapture = quickLeadEnabled
    ? {
        ...(requestedSourceType || eventId ? { sourceType: requestedSourceType || 'trade_show' } : {}),
        ...(eventSourceLabel ? { sourceLabel: eventSourceLabel } : {}),
        ...(eventId ? { tradeEventId: eventId, sourceType: 'trade_show' } : {}),
        leadType: quickLeadType,
        selectedProductIds: quickLeadProductId ? [quickLeadProductId] : [],
        autoOpenQuoteAfterSave: false,
        title: 'Quick lead',
        description: 'Capture the minimum buyer context, keep the product lane pre-linked, and move into follow-up or Quote when ready.',
      }
    : null;

  return (
    <div className="space-y-4">
      <div className="flex justify-end px-3 md:hidden"><Link href="/quick-quote" className="inline-flex min-h-11 items-center rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white">+ Quick Quote</Link></div>
      {!quickLeadEnabled ? (
        <div className="md:hidden">
          <LeadsMobileSurface
            initialLeadType={quickLeadType}
            leads={mobileLeadCards}
            user={mobileUser}
            signedIn={mobileSignedIn}
          />
        </div>
      ) : null}

      <div className={quickLeadEnabled ? "space-y-4" : "hidden space-y-4 md:block"}>
        <QueryIssuesAlert issues={data.queryIssues} />
        {trialLeadLimitReached ? (
          <TrialBlockedNotice message={`Guided trial lead limit reached (${trialCapability?.max_leads}). Remove a test lead or convert the workspace to add more.`} />
        ) : null}
        {guidedTrialCoach ? (
          <div className="rounded-panel border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900 shadow-sm">
            Trade Show Trial mode: this list shows captured booth leads. You can add follow-up tasks, but quotes and orders stay preview-only until upgrade.
          </div>
        ) : null}
        {isStarkPackmate && canAccessStarkInbound ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-white">Inbound</span>
                <p className="text-sm font-bold text-slate-900">Interakt qualification queue</p>
              </div>
              
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {canManageStarkInboundAssignments ? <Link href="/leads/inbound/assignments" className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50">Manage assignments</Link> : null}
              <Link href="/leads/inbound" className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">Open Inbound →</Link>
            </div>
          </div>
        ) : null}
        <LeadEventFilterNarrower
          leads={data.leads.map((lead) => ({
            id: lead.id,
            trade_event_id: lead.trade_event_id ?? null,
            owner_user_id: lead.owner_user_id ?? null,
            stage_id: lead.stage_id ?? null,
            country_id: lead.country_id ?? null,
          }))}
          leadMarkets={data.leadMarkets}
          leadProductInterests={data.leadProductInterests}
          countries={data.countries.map((country) => ({ id: country.id, market_id: country.market_id ?? null }))}
        />
        <LeadsWorkspace
          currentUserId={viewModel.currentUserId}
          coordinatorAssignments={coordinatorAssignments}
          canDelegateLeads={canDelegateLeads}
          canManageLeads={viewModel.canManageLeads}
          guidedTrialCoach={guidedTrialCoach}
          readOnlyMessage={viewModel.readOnlyMessage}
          isWorkspaceEmpty={viewModel.isWorkspaceEmpty}
          leads={data.leads.map((lead) => ({ ...lead, whatsapp_number: (lead as any).whatsapp_number ?? null, intro_sent: lead.intro_sent ?? false }))}
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
          prices={data.prices}
          pricingRules={data.pricingRules}
          initialMode={viewModel.workspaceMode}
          initialLeadType={viewModel.initialLeadType}
          initialTodayState={viewModel.todayState}
          initialQuickCapture={initialQuickCapture}
          initialEventId={eventId || null}
          // Event-origin Quick Lead should use the fast capture form with its event context seeded.
          initialFastField={Boolean(eventId)}
        />
        <QuoteReviewInlineComplianceFix />
      </div>
    </div>
  );
}
