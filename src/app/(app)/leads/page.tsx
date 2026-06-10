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
          <section className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Guided trial workspace</p>
                <p className="mt-1 text-sm font-bold text-slate-900">Start with the top-right + Quick Lead button.</p>
                <p className="mt-1 text-xs font-medium leading-5 text-slate-600">
                  The helper appears inside the Quick Lead drawer after it opens, so the user learns camera scan, upload, manual entry, and save in the active workflow.
                </p>
              </div>
              <div className="rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-700">
                Step 1: capture lead
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
          prices={data.prices}
          pricingRules={data.pricingRules}
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
