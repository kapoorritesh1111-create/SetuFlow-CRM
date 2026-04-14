import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getLeadProfileData } from '@/lib/queries/leads';
import { hasSupabaseEnv } from '@/lib/env';
import QuotePrintButton from '@/features/leads/components/quote-print-button';
import { QuoteWorkspace } from '@/features/quotes/components/quote-workspace';
import { buildLeadActivityTimeline } from '@/lib/activity-timeline';
import { ActivityTimeline } from '@/components/ui/activity-timeline';
import {
  buildCatalogPricingSnapshot,
  buildCatalogProductOptions,
  getPricingReadinessClasses,
  getPricingReadinessLabel,
} from '@/lib/catalog-pricing-model';
import { buildLeadDocumentRequirementState } from '@/lib/document-requirements';
import { listSavedViewsForOrganization } from '@/lib/savedViews';
import { getViewPreference } from '@/lib/viewPreferences';
import { normalizeQuoteRecords, normalizeQuotesForTimeline } from '@/lib/normalizers/quote-normalizer';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { StateMessage } from '@/components/ui/state-message';

function readSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default async function QuotePage({ params, searchParams }: { params: { leadId: string }, searchParams?: { quoteId?: string | string[] } }) {
  let workspace: Awaited<ReturnType<typeof getWorkspaceAccess>> | null = null;

  try {
    workspace = await getWorkspaceAccess();
  } catch {
    return (
      <EmptyState
        title="Workspace unavailable"
        description="We were unable to load your workspace. Please refresh or try again later."
      />
    );
  }

  if (!hasSupabaseEnv || workspace?.missingEnv) {
    return (
      <EmptyState
        title="Configuration required"
        description="SETU Flow needs Supabase environment values. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local or Vercel project settings."
      />
    );
  }

  if (!workspace?.membership || !workspace?.organization) {
    return (
      <EmptyState
        title="Workspace membership needed"
        description="Your account is signed in, but no active organization membership could be loaded."
      />
    );
  }

  const leadId = params.leadId;

  let data: Awaited<ReturnType<typeof getLeadProfileData>> | null = null;
  try {
    data = await getLeadProfileData(workspace.organization.id, leadId);
  } catch {
    return (
      <EmptyState
        title="Error loading lead"
        description="An unexpected error occurred while loading the lead. Please try again."
      />
    );
  }

  if (!data || !data.lead) {
    return (
      <EmptyState
        title="Lead not found"
        description="The requested lead could not be loaded from the active workspace."
      />
    );
  }

  const [quoteSavedViews, quotePreference] = await Promise.all([
    listSavedViewsForOrganization(workspace.organization.id, 'quotes'),
    getViewPreference(workspace.membership.id, 'quotes'),
  ]);

  const lead = data.lead;
  const workflow = data.workflow ?? {};
  const qualificationStatus = String(workflow.qualificationStatus ?? 'not_started');
  const mappedProductCount = Array.isArray(data.linkedProducts) ? data.linkedProducts.length : 0;
  const mappedMarketCount = Array.isArray(data.linkedMarkets) ? data.linkedMarkets.length : 0;
  const contracts = Array.isArray(data.contracts) ? data.contracts : [];
  const canManageQuotes = hasWorkspaceCapability(workspace.currentRoles, 'lead.manage');
  const canSendQuotes = hasWorkspaceCapability(workspace.currentRoles, 'quote.send');
  const readOnlyMessage = getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage');
  const sendReadOnlyMessage = getReadOnlyWorkspaceMessage(workspace.currentRoles, 'quote.send');
  const requestedQuoteId = readSearchParam(searchParams?.quoteId).trim() || null;
  const leadCommandHref = `/leads/${leadId}?tab=quotes`;

  if (qualificationStatus !== 'qualified') {
    return (
      <EmptyState
        title="Qualification required"
        description="This lead must be qualified before the quote workspace can be opened. Update qualification on the lead profile and return here."
      />
    );
  }

  if (mappedProductCount === 0) {
    return (
      <EmptyState
        title="Product mapping required"
        description="Link at least one structured product to this qualified lead before entering the quote workspace."
      />
    );
  }

  const missingMarketCoverage = mappedMarketCount === 0;

  const pricingSnapshot = buildCatalogPricingSnapshot({
    linkedProducts: data.linkedProducts,
    variants: data.variants,
    prices: data.prices,
    rules: data.pricingRules,
    rfqLineItems: data.rfqs.flatMap((rfq) => rfq.lineItems),
    quoteLineItems: data.quotes.flatMap((quote) => quote.lineItems),
  });

  const catalogProducts = buildCatalogProductOptions({
    products: (data.linkedProducts ?? [])
      .filter((item) => item && item.id && item.name)
      .map((item) => ({ id: item.id, name: item.name })),
    variants: data.variants,
    prices: data.prices,
    rules: data.pricingRules,
    marketIds: data.linkedMarkets.map((market) => market.id),
    preferredCurrency: lead.deal_currency ?? null,
  });

  const ownerMap = new Map(
    (data.profiles ?? []).map((profile) => [
      profile.id,
      profile.full_name ?? profile.username ?? 'Team member',
    ]),
  );

  const documentRequirementSnapshot = buildLeadDocumentRequirementState({
    rules: data.documentRequirementRules,
    leadType: lead.lead_type,
    marketIds: data.linkedMarkets.map((market) => market.id),
    productIds: data.linkedProducts.map((product) => product.id),
    documents: data.documents,
    scope: 'quote_send',
  });

  const openComplianceCount = data.complianceItems.filter(
    (item) => !['approved', 'waived', 'complete', 'completed'].includes(String(item.status ?? '').toLowerCase()),
  ).length;

  const quoteSendGuard = {
    blockerCount: documentRequirementSnapshot.blockerCount + (openComplianceCount > 0 ? 1 : 0),
    blockerReasons: [
      ...documentRequirementSnapshot.blockerReasons,
      ...(openComplianceCount > 0
        ? [`${openComplianceCount} compliance blocker${openComplianceCount === 1 ? '' : 's'} still open`]
        : []),
    ],
  };

  const stageNameMap = new Map(data.stages.map((stage) => [stage.id, stage.name]));
  const normalizedQuotes = normalizeQuotesForTimeline(data.quotes || []);

  const timelineEvents = buildLeadActivityTimeline({
    lead: {
      id: lead.id,
      company_name: lead.company_name,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
      notes: lead.notes,
    },
    activities: data.activities,
    followUps: data.followUps,
    stageHistory: data.stageHistory,
    rfqs: data.rfqs,
    quotes: normalizedQuotes,
    complianceItems: data.complianceItems.map((item) => ({
      ...item,
      reviewer_name: item.reviewer_user_id ? ownerMap.get(item.reviewer_user_id) ?? null : null,
    })),
    complianceDefinitions: data.complianceDefinitions,
    communications: data.communications.map((item) => ({
      id: item.id,
      lead_id: item.lead_id,
      quote_id: item.quote_id,
      related_entity: item.related_entity,
      related_id: item.related_id,
      communication_type: item.communication_type,
      channel: item.channel,
      subject: item.subject,
      summary: item.summary,
      status: item.status,
      draft_source: item.draft_source,
      created_at: item.created_at,
      sent_at: item.sent_at,
      scheduled_at: item.scheduled_at,
      metadata: item.metadata,
    })),
    stageNameMap,
  });

  const quoteCount = data.quotes.length;
  const acceptedQuoteCount = data.quotes.filter((quote) => String(quote.status ?? '').toLowerCase() === 'accepted').length;
  const inNegotiationCount = data.quotes.filter((quote) => String(quote.status ?? '').toLowerCase() === 'negotiating').length;
  const openQuoteCount = data.quotes.filter((quote) => !['accepted', 'rejected', 'expired', 'cancelled'].includes(String(quote.status ?? '').toLowerCase())).length;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:space-y-6">
      <PageHeader
        className="rounded-[12px] px-5 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] sm:px-6 sm:py-[18px]"
        eyebrow="Quote workspace"
        title={lead.company_name}
        description="Stay in the same lead workflow here. Review pricing, clear blockers, send the quote, and move accepted commercial work into contracts."
        actions={[
          { label: 'Back to lead', href: leadCommandHref },
          { label: 'Quote AI review', href: `/ai-suggestions?family=quote&leadId=${leadId}` },
          { label: 'Open contracts', href: '/contracts', type: 'primary' },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <div className="premium-surface rounded-[12px] p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Quote command lane</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Move through Product, Pricing, Terms, Review, and Send inside one commercial surface</h2>
              <p className="mt-2 text-sm text-slate-600">Stay anchored to the lead command center while moving the current quote through Product, Pricing, Terms, Review, and Send. Surface blockers once, keep one quote in focus, and move accepted work straight into contracts.</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPricingReadinessClasses(pricingSnapshot.pricingReadiness)}`}>
              {getPricingReadinessLabel(pricingSnapshot.pricingReadiness)}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-neutral-50 px-3 py-1.5 text-sm font-medium text-slate-700">{qualificationStatus.replaceAll('_', ' ')}</span>
            <span className="rounded-full bg-neutral-50 px-3 py-1.5 text-sm font-medium text-slate-700">{mappedProductCount} mapped products</span>
            <span className="rounded-full bg-neutral-50 px-3 py-1.5 text-sm font-medium text-slate-700">{mappedMarketCount} covered markets</span>
            <span className="rounded-full bg-neutral-50 px-3 py-1.5 text-sm font-medium text-slate-700">{openQuoteCount} open quotes</span>
            <span className="rounded-full bg-neutral-50 px-3 py-1.5 text-sm font-medium text-slate-700">{quoteSendGuard.blockerCount} send blockers</span>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={leadCommandHref} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Lead command center</Link>
            <Link href="/contracts" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Contracts workspace</Link>
          </div>
        </div>

        <div className="premium-surface rounded-[12px] p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Operating rules</p>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="rounded-[10px] bg-neutral-50 p-4">
              <p className="font-semibold text-slate-900">Keep one quote in focus</p>
              <p className="mt-1">Use the fast lane for the current quote. Open the full editor only when pricing or approval needs deeper revision.</p>
            </div>
            <div className="rounded-[10px] bg-neutral-50 p-4">
              <p className="font-semibold text-slate-900">Treat blockers as gates</p>
              <p className="mt-1">Document and compliance blockers should stop send, not sit as soft reminders.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="premium-surface rounded-[12px] p-5 md:p-6">
        <h3 className="text-lg font-semibold text-slate-900">Lead context and pricing linkage</h3>
        <div className="mt-4 grid gap-4 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-3">
          <p><span className="font-medium text-slate-900">Company:</span> {lead.company_name}</p>
          <p><span className="font-medium text-slate-900">Contact:</span> {lead.contact_name ?? 'No contact'}</p>
          <p><span className="font-medium text-slate-900">Email:</span> {lead.email ?? 'No email'}</p>
          <p><span className="font-medium text-slate-900">Phone:</span> {lead.phone ?? 'No phone'}</p>
          <p><span className="font-medium text-slate-900">Country:</span> {lead.country ?? 'Not set'}</p>
          <p><span className="font-medium text-slate-900">Lead type:</span> {lead.lead_type}</p>
        </div>

        <div className="mt-6 rounded-[10px] bg-neutral-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Pricing linkage</p>
              <p className="mt-1 text-sm text-slate-600">The quote stays anchored to the same catalog, product coverage, and market context already visible on the lead.</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPricingReadinessClasses(pricingSnapshot.pricingReadiness)}`}>
              {getPricingReadinessLabel(pricingSnapshot.pricingReadiness)}
            </span>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[10px] bg-white px-3 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Priced products</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{pricingSnapshot.linkedPricedProductCount}/{pricingSnapshot.linkedProductCount}</p>
            </div>
            <div className="rounded-[10px] bg-white px-3 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Covered markets</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{pricingSnapshot.coveredMarketCount}</p>
            </div>
            <div className="rounded-[10px] bg-white px-3 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Quote line coverage</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{pricingSnapshot.quotePricedLineCount}/{pricingSnapshot.quoteLinkedLineCount || 0}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[10px] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Contract handoff</p>
              <p className="mt-1 text-sm text-slate-600">Accepted quotes seed contract records automatically so operators can continue signature, activation, and completion from the contracts workspace.</p>
            </div>
            <Link href="/contracts" className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100">Open contracts workspace</Link>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            {contracts.length ? `${contracts.length} contract workspace${contracts.length === 1 ? '' : 's'} already linked to this lead.` : 'No contract has been seeded for this lead yet. Once a quote is accepted, the contract workspace will populate automatically.'}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <QuotePrintButton />
          <span className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-400">Use browser print to save or share as PDF</span>
        </div>
      </div>

      {readOnlyMessage ? (
        <StateMessage
          tone="warning"
          title="Read-only quote workspace"
          description={`${readOnlyMessage} You can review pricing, RFQ context, and negotiation history here, but quote draft and revision actions stay disabled.`}
        />
      ) : null}

      {missingMarketCoverage ? (
        <StateMessage
          tone="warning"
          title="Market coverage context is missing"
          description="No markets are mapped to this lead yet. The quote workspace still loads, but market-based pricing and supplier coverage summaries should be treated as incomplete until market mapping is added on the lead."
        />
      ) : null}

      {!data.rfqs.length ? (
        <StateMessage
          tone="neutral"
          title="No RFQ context linked yet"
          description="You can still draft a quote from mapped products, but RFQ-linked supplier context and response history will remain empty until an RFQ is created for this lead."
        />
      ) : null}

      <QuoteWorkspace
        leadId={leadId}
        rfqs={data.rfqs}
        quotes={normalizeQuoteRecords(data.quotes)}
        products={catalogProducts}
        savedViews={quoteSavedViews}
        initialSavedView={quotePreference?.savedViewId ?? quotePreference?.builtInViewKey ?? 'all'}
        redirectPath={`/leads/${leadId}/quote`}
        leadCommandHref={leadCommandHref}
        initialQuoteId={requestedQuoteId}
        canManageQuotes={canManageQuotes}
        canSendQuotes={canSendQuotes}
        readOnlyMessage={readOnlyMessage}
        sendReadOnlyMessage={sendReadOnlyMessage}
        rfqWorkspaceHref={`/leads/${leadId}/rfq/new`}
        pricingSnapshot={pricingSnapshot}
        quoteSendGuard={quoteSendGuard}
        quoteVersions={data.quoteVersions}
        negotiationEvents={data.negotiationEvents}
        communications={data.communications.filter((item) => item.quote_id || item.related_entity === 'quote').map((item) => ({
          id: item.id,
          quote_id: item.quote_id,
          related_entity: item.related_entity,
          related_id: item.related_id,
          subject: item.subject,
          summary: item.summary,
          status: item.status,
          created_at: item.created_at,
          draft_source: item.draft_source,
          metadata: item.metadata,
        }))}
      />

      <div className="premium-surface rounded-[12px] p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">Commercial timeline</h3>
          <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Lead, RFQ, quote, compliance, contracts</span>
        </div>
        <div className="mt-4">
          <ActivityTimeline events={timelineEvents} emptyLabel="No commercial activity logged yet." />
        </div>
      </div>
    </div>
  );
}
