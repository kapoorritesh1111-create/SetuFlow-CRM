// UPDATED FILE
import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { LeadsWorkspace } from '@/features/leads/components/leads-workspace';
import { LeadEventFilterNarrower } from '@/features/leads/components/lead-event-filter-narrower';
import { LeadCaptureValidationGuard } from '@/features/leads/components/lead-capture-validation-guard';
import { LeadsMobileSurface } from '@/features/leads/components/leads-mobile-surface';
import { QuoteReviewInlineComplianceFix } from '@/features/leads/components/quote-review-inline-compliance-fix';
import { getLeadsPageData } from '@/lib/queries/leads';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { buildLeadsPageViewModel } from '@/features/leads/logic/build-leads-page-view-model';
import { buildMobileLeadCardsFromAppData, buildMobileSignedInSummary, buildMobileUserContextFromWorkspace } from '@/features/mobile/lib/app-mobile-leads';
import type { MobileLeadType } from '@/features/mobile/lib/role-aware-leads';

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function readModeLeadType(value?: string | string[]): MobileLeadType {
  const mode = readParam(value);
  if (mode === 'buyers' || mode === 'buyer') return 'buyer';
  if (mode === 'suppliers' || mode === 'supplier') return 'supplier';
  return '';
}

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
    eventId?: string | string[];
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

  const quickLeadEnabled = ['1', 'true', 'yes'].includes(readParam(searchParams?.quickLead).toLowerCase());
  const quickLeadProductId = readParam(searchParams?.productId).trim();
  const eventId = readParam(searchParams?.eventId).trim();
  const initialFastField = quickLeadEnabled && Boolean(eventId);
  const modeLeadType = readModeLeadType(searchParams?.mode);
  const showQuickLeadGuide = viewModel.isWorkspaceEmpty && viewModel.canManageLeads;
  const quickLeadHref = `${PRODUCT_ROUTES.app.leads}?quickLead=1`;

  const mobileLeadCards = buildMobileLeadCardsFromAppData(data as any);
  const mobileUser = buildMobileUserContextFromWorkspace(workspace as any);
  const mobileSignedIn = await buildMobileSignedInSummary(workspace as any);

  const initialQuickCapture = quickLeadEnabled
    ? {
        sourceType: readParam(searchParams?.sourceType).trim() || 'trade_show',
        sourceLabel: readParam(searchParams?.sourceLabel).trim() || 'Trade show fast lane',
        selectedProductIds: quickLeadProductId ? [quickLeadProductId] : [],
        autoOpenQuoteAfterSave: ['1', 'true', 'yes'].includes(readParam(searchParams?.autoQuote).toLowerCase()),
        title: 'Trade-show quick lead',
        description: 'Capture the minimum buyer context, keep the product lane pre-linked, and move into Quote faster.',
      }
    : null;

  return (
    <div className="space-y-4">
      <LeadCaptureValidationGuard />
      <div className="md:hidden">
        <LeadsMobileSurface
          quickLeadEnabled={quickLeadEnabled}
          initialLeadType={modeLeadType || (readParam(searchParams?.sourceType).trim() === 'supplier' ? 'supplier' : 'buyer')}
          eventId={eventId || null}
          leads={mobileLeadCards}
          user={mobileUser}
          signedIn={mobileSignedIn}
        />
      </div>

      <div className="hidden space-y-4 md:block">
        <QueryIssuesAlert issues={data.queryIssues} />
        {showQuickLeadGuide ? (
          <section className="relative overflow-hidden rounded-[1.75rem] border border-sky-200 bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_55%,#ecfeff_100%)] p-5 shadow-[0_18px_45px_rgba(12,127,255,0.12)]">
            <div className="absolute right-6 top-6 h-16 w-16 rounded-full bg-sky-300/20 blur-2xl" />
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-3xl">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">Guided trial step 1</p>
                <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">Start by creating your first lead with Quick Lead</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                  Use Quick Lead to scan a card, upload an inquiry file, or enter a buyer/supplier manually. After the first lead is saved, continue the trial path into quote and order.
                </p>
              </div>
              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <a
                  href={quickLeadHref}
                  className="inline-flex animate-pulse items-center justify-center rounded-2xl bg-[#0b2e4a] px-5 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(11,46,74,0.25)] transition hover:-translate-y-0.5 hover:bg-[#0c7fff]"
                >
                  + Quick Lead
                </a>
                <p className="text-xs font-semibold text-slate-500">Camera, upload, or manual entry</p>
              </div>
            </div>
          </section>
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
        canManageLeads={viewModel.canManageLeads}
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
        prices={data.prices} pricingRules={data.pricingRules}
        initialMode={viewModel.workspaceMode}
        initialLeadType={viewModel.initialLeadType}
        initialTodayState={viewModel.todayState}
        initialQuickCapture={initialQuickCapture}
        initialEventId={eventId || null}
        initialFastField={initialFastField}
        />
        <QuoteReviewInlineComplianceFix />
      </div>
    </div>
  );
}
