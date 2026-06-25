import Link from 'next/link';
import type { CSSProperties } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getLeadProfileData } from '@/lib/queries/leads';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { QuoteWorkspace } from '@/features/quotes/components/quote-workspace';
import QuoteVersionRail from '@/features/quotes/quote-builder/QuoteVersionRail';
import { ComplianceCheckPopover } from '@/features/compliance/components/compliance-check-popover';
import { buildLeadActivityTimeline } from '@/lib/activity-timeline';
import { ActivityTimeline } from '@/components/ui/activity-timeline';
import {
  buildCatalogPricingSnapshot,
  buildCatalogProductOptions,
} from '@/lib/catalog-pricing-model';
import { buildLeadDocumentRequirementState } from '@/lib/document-requirements';
import { listSavedViewsForOrganization } from '@/lib/savedViews';
import { getViewPreference } from '@/lib/viewPreferences';
import { normalizeQuoteRecords, normalizeQuotesForTimeline } from '@/lib/normalizers/quote-normalizer';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { createLeadQuoteDraftFromLead } from '@/features/quotes/server/lead-draft-actions';

const TERMINAL_QUOTE_STATUSES = new Set(['accepted', 'rejected', 'expired', 'cancelled']);
const OPEN_QUOTE_STATUSES = new Set(['draft', 'in_review', 'approval_pending', 'sent', 'negotiating', 'revised']);

function readSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function getApprovalStateForVersion(approvalRequests: any[], versionId: string) {
  const requests = approvalRequests
    .filter((request) => request.quote_version_id === versionId)
    .sort((left, right) => String(right.decided_at ?? right.created_at ?? '').localeCompare(String(left.decided_at ?? left.created_at ?? '')));
  if (requests.some((request) => String(request.status ?? '').toLowerCase() === 'pending')) return 'pending';
  const latestDecision = requests.find((request) => ['approved', 'rejected'].includes(String(request.status ?? '').toLowerCase()));
  if (String(latestDecision?.status ?? '').toLowerCase() === 'approved') return 'approved';
  if (String(latestDecision?.status ?? '').toLowerCase() === 'rejected') return 'rejected';
  return 'none';
}

function enrichQuoteVersionsWithApprovals(quoteVersions: any[], approvalRequests: any[]) {
  return quoteVersions.map((version) => {
    const requests = approvalRequests
      .filter((request) => request.quote_version_id === version.id)
      .sort((left, right) => String(right.decided_at ?? right.created_at ?? '').localeCompare(String(left.decided_at ?? left.created_at ?? '')));
    const latestRequest = requests[0] ?? null;
    return {
      ...version,
      approval_state: getApprovalStateForVersion(approvalRequests, version.id),
      approval_reason: latestRequest?.reason ?? null,
      approval_requested_at: latestRequest?.created_at ?? null,
      approval_decided_at: latestRequest?.decided_at ?? null,
    };
  });
}

function sortQuotesNewestFirst(quotes: any[]) {
  return [...(quotes ?? [])].sort((left, right) => {
    const leftTime = Date.parse(String(left?.updated_at ?? left?.created_at ?? '')) || 0;
    const rightTime = Date.parse(String(right?.updated_at ?? right?.created_at ?? '')) || 0;
    return rightTime - leftTime;
  });
}

function titleCase(value?: string | null) {
  return String(value ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function QuoteDraftForm({ leadId, sourceQuoteId, label, forceNew = false, primary = true }: { leadId: string; sourceQuoteId?: string | null; label: string; forceNew?: boolean; primary?: boolean }) {
  const className = primary
    ? 'inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-teal-700'
    : 'inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50';

  return (
    <form action={createLeadQuoteDraftFromLead} className="inline-flex">
      <input type="hidden" name="lead_id" value={leadId} />
      {sourceQuoteId ? <input type="hidden" name="source_quote_id" value={sourceQuoteId} /> : null}
      <input type="hidden" name="force_new" value={forceNew ? 'true' : 'false'} />
      <button type="submit" className={className}>{label}</button>
    </form>
  );
}

function Stepper({ state }: { state: 'empty' | 'locked' | 'open' }) {
  const steps = [
    { label: 'Product', n: 1 },
    { label: 'Pricing', n: 2 },
    { label: 'Terms', n: 3 },
    { label: 'Review', n: 4 },
    { label: 'Send gate', n: 5 },
  ];

  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-base font-black tracking-tight text-slate-950">Quote Builder</h2>
        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">
          {state === 'locked' ? 'Locked quote selected' : state === 'empty' ? 'Ready to start' : 'Continue builder'}
        </span>
        <span className="ml-auto text-xs font-semibold text-slate-400">Capture → Lead → Quote → Order</span>
      </div>
      <div className="flex items-start gap-1">
        {steps.map((step, index) => {
          const done = state === 'locked' ? index < 5 : state === 'open' ? index < 2 : index === 0;
          const current = state === 'empty' ? index === 0 : state === 'open' ? index === 2 : false;
          const circle = done ? 'bg-emerald-600 text-white ring-4 ring-emerald-100' : current ? 'bg-slate-900 text-white ring-4 ring-slate-100' : 'border-2 border-slate-200 bg-white text-slate-400';
          const label = done ? 'text-emerald-700' : current ? 'text-slate-950' : 'text-slate-400';
          return (
            <div key={step.n} className="flex flex-1 items-start">
              <div className="flex flex-1 flex-col items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${circle}`}>{done ? '✓' : step.n}</div>
                <div className={`text-center text-[10px] font-black uppercase tracking-[0.08em] ${label}`}>{step.label}</div>
              </div>
              {index < steps.length - 1 ? <div className={`mt-4 h-0.5 flex-1 ${done ? 'bg-emerald-500' : 'bg-slate-200'}`} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BuilderPrimaryPanel({ leadId, activeQuote, blockerCount, blockerReasons, requestedQuoteId }: { leadId: string; activeQuote: any | null; blockerCount: number; blockerReasons: string[]; requestedQuoteId: string | null }) {
  const status = String(activeQuote?.status ?? '').toLowerCase();
  const isLocked = activeQuote ? TERMINAL_QUOTE_STATUSES.has(status) : false;
  const isOpen = activeQuote ? !isLocked : false;
  const state = isLocked ? 'locked' : isOpen ? 'open' : 'empty';
  const quoteId = activeQuote?.id ?? requestedQuoteId ?? null;
  const orderHref = quoteId ? `/orders?quoteId=${quoteId}` : '/orders';

  return (
    <section className="grid gap-4">
      <Stepper state={state} />
      {isLocked ? (
        <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Accepted quote preserved</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">This quote is accepted and locked.</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-900">The commercial record is preserved. Create a new draft to continue quoting without editing the accepted quote.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <QuoteDraftForm leadId={leadId} sourceQuoteId={quoteId} label="Create New Quote" forceNew />
            {quoteId ? <Link href={`/leads/${leadId}/quote?quoteId=${quoteId}#quote-history`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-200 bg-white px-5 text-sm font-black text-emerald-800">View Accepted Quote History</Link> : null}
            <Link href={orderHref} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-200 bg-white px-5 text-sm font-black text-emerald-800">View Order Handoff</Link>
          </div>
        </div>
      ) : isOpen ? (
        <div className="rounded-[1.4rem] border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Working quote</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Continue Quote Builder</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-900">This quote is still open. Move through product, pricing, terms, review, and the send gate from this clean builder surface.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Selected status</p><b className="mt-1 block text-lg text-slate-950">{titleCase(status || 'draft')}</b></div>
            <div className="rounded-2xl bg-white p-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Send gate</p><b className="mt-1 block text-lg text-slate-950">{blockerCount > 0 ? `${blockerCount} blocker${blockerCount === 1 ? '' : 's'}` : 'Ready'}</b></div>
            <div className="rounded-2xl bg-white p-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Next action</p><b className="mt-1 block text-lg text-slate-950">Review terms</b></div>
          </div>
        </div>
      ) : (
        <div className="rounded-[1.4rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">No quote yet</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Create Quote Draft</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Start from this lead’s product interests. The canonical quote draft RPC will create the parent quote, v1 draft, line items, activity, communication, and audit trail.</p>
          <div className="mt-5"><QuoteDraftForm leadId={leadId} label="Create Quote Draft" /></div>
        </div>
      )}
      {blockerCount > 0 && quoteId ? (
        <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-700">Send gate blocker</p>
              <p className="mt-1 text-sm font-semibold text-rose-950">Quote Review is blocked until the source-of-truth compliance gate clears.</p>
              <ul className="mt-2 list-disc pl-5 text-sm leading-6 text-rose-800">
                {blockerReasons.slice(0, 4).map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            </div>
            <ComplianceCheckPopover
              leadId={leadId}
              quoteId={quoteId}
              triggerLabel="Compliance check"
              title="Quote Review compliance check"
              contextLabel={`Quote Builder · ${quoteId.slice(0, 8)}`}
              blockerReasons={blockerReasons}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MobileSafeLeadQuoteSurface({ lead, quoteCount, leadId }: { lead: any; quoteCount: number; leadId: string }) {
  return (
    <section className="min-h-screen bg-[#071327] px-4 pb-28 pt-5 text-white md:hidden">
      <div className="rounded-[2rem] bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,.35),rgba(15,23,42,0)_38%),linear-gradient(145deg,#0c172d,#10284c)] p-5 shadow-[0_24px_80px_rgba(0,0,0,.28)]">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">Quote Builder</p>
        <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight">{lead.company_name}</h1>
        <p className="mt-2 text-sm font-semibold text-white/70">{quoteCount ? `${quoteCount} quote${quoteCount === 1 ? '' : 's'} on this lead` : 'No quote yet'}</p>
      </div>
      <div className="mt-4 rounded-[2rem] border border-white/10 bg-white p-5 text-slate-950 shadow-xl shadow-black/15">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Mobile quote</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight">Use desktop for full builder controls</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">Locked quote decisions, create-new-draft actions, and review gates are optimized for desktop in this sprint.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link href={`/leads/${leadId}`} className="flex min-h-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-900">Open lead</Link>
          <Link href="/orders" className="flex min-h-14 items-center justify-center rounded-2xl bg-blue-600 text-sm font-black text-white">Orders</Link>
        </div>
      </div>
    </section>
  );
}

const heroStyle: CSSProperties = { background: 'linear-gradient(135deg,#061c2e 0%,#0b2e4a 55%,#1a5fa0 100%)', borderRadius: '22px', padding: '18px 22px', color: 'white', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' };

export default async function QuotePage({ params, searchParams }: { params: { leadId: string }, searchParams?: { quoteId?: string | string[], quoteDraftError?: string | string[] } }) {
  let workspace: Awaited<ReturnType<typeof getWorkspaceAccess>> | null = null;

  try {
    workspace = await getWorkspaceAccess();
  } catch {
    return <EmptyState title="Workspace unavailable" description="We were unable to load your workspace. Please refresh or try again later." />;
  }

  if (!hasSupabaseEnv || workspace?.missingEnv) {
    return <EmptyState title="Configuration required" description="SETU Flow needs Supabase environment values. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local or Vercel project settings." />;
  }

  if (!workspace?.membership || !workspace?.organization) {
    return <EmptyState title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded." />;
  }

  const leadId = params.leadId;
  const requestedQuoteId = readSearchParam(searchParams?.quoteId).trim() || null;
  const quoteDraftError = readSearchParam(searchParams?.quoteDraftError).trim() || null;
  const leadCommandHref = `/leads/${leadId}`;

  let data: Awaited<ReturnType<typeof getLeadProfileData>> | null = null;
  try {
    data = await getLeadProfileData(workspace.organization.id, leadId);
  } catch {
    return <EmptyState title="Error loading lead" description="An unexpected error occurred while loading the lead. Please try again." />;
  }

  if (!data || !data.lead) {
    return <EmptyState title="Lead not found" description="The requested lead could not be loaded from the active workspace." />;
  }

  const lead = data.lead;
  const workflow = data.workflow ?? {};
  const qualificationStatus = String(workflow.qualificationStatus ?? 'not_started');
  const mappedProductCount = Array.isArray(data.linkedProducts) ? data.linkedProducts.length : 0;
  const mappedMarketCount = Array.isArray(data.linkedMarkets) ? data.linkedMarkets.length : 0;
  const hasExistingQuote = Array.isArray(data.quotes) && data.quotes.length > 0;

  if (!hasExistingQuote && qualificationStatus !== 'qualified') {
    return <EmptyState title="Qualification required" description="This lead must be qualified before the first quote can be created. Open the lead, use Qualify & Map to confirm qualification and product/category interest, then return here." />;
  }

  if (!hasExistingQuote && mappedProductCount === 0) {
    return <EmptyState title="Product mapping required" description="Link at least one structured product or category-backed product interest to this qualified lead before creating its first quote." />;
  }

  const [quoteSavedViews, quotePreference] = await Promise.all([
    listSavedViewsForOrganization(workspace.organization.id, 'quotes'),
    getViewPreference(workspace.membership.id, 'quotes'),
  ]);

  const canManageQuotes = hasWorkspaceCapability(workspace.currentRoles, 'lead.manage');
  const canSendQuotes = hasWorkspaceCapability(workspace.currentRoles, 'quote.send');
  const readOnlyMessage = getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage');
  const sendReadOnlyMessage = getReadOnlyWorkspaceMessage(workspace.currentRoles, 'quote.send');
  const canApproveAsAdmin = (workspace.currentRoles ?? []).some((role: string) => ['owner', 'admin'].includes(role));

  const documentRequirementSnapshot = buildLeadDocumentRequirementState({
    rules: data.documentRequirementRules,
    leadType: lead.lead_type,
    marketIds: data.linkedMarkets.map((market) => market.id),
    productIds: data.linkedProducts.map((product) => product.id),
    documents: data.documents,
    scope: 'quote_send',
  });

  const openComplianceCount = data.complianceItems.filter((item) => !['approved', 'waived', 'complete', 'completed'].includes(String(item.status ?? '').toLowerCase())).length;
  const quoteSendGuard = {
    blockerCount: documentRequirementSnapshot.blockerCount + (openComplianceCount > 0 ? 1 : 0),
    blockerReasons: [
      ...documentRequirementSnapshot.blockerReasons,
      ...(openComplianceCount > 0 ? [`${openComplianceCount} compliance blocker${openComplianceCount === 1 ? '' : 's'} still open`] : []),
    ],
  };

  const pricingSnapshot = buildCatalogPricingSnapshot({
    linkedProducts: data.linkedProducts,
    variants: data.variants,
    prices: data.prices,
    rules: data.pricingRules,
    rfqLineItems: (data.rfqs ?? []).flatMap((rfq) => rfq.lineItems),
    quoteLineItems: (data.quotes ?? []).flatMap((quote) => quote.lineItems),
  });

  const catalogProducts = buildCatalogProductOptions({
    products: (data.linkedProducts ?? []).filter((item) => item && item.id && item.name).map((item) => ({ id: item.id, name: item.name })),
    variants: data.variants,
    prices: data.prices,
    rules: data.pricingRules,
    marketIds: data.linkedMarkets.map((market) => market.id),
    preferredCurrency: lead.deal_currency ?? null,
  });

  const supabase = await createClient();
  const { data: pricingEngineSettings } = await (supabase as any)
    .from('pricing_engine_settings')
    .select('approval_threshold_percent')
    .eq('organization_id', workspace.organization.id)
    .maybeSingle();
  const pricingEngineThresholdPercent = typeof pricingEngineSettings?.approval_threshold_percent === 'number' ? pricingEngineSettings.approval_threshold_percent : null;

  const ownerMap = new Map((data.profiles ?? []).map((profile) => [profile.id, profile.full_name ?? profile.username ?? 'Team member']));
  const stageNameMap = new Map(data.stages.map((stage) => [stage.id, stage.name]));
  const normalizedQuotes = normalizeQuotesForTimeline(data.quotes || []);
  const timelineEvents = buildLeadActivityTimeline({
    lead: { id: lead.id, company_name: lead.company_name, created_at: lead.created_at, updated_at: lead.updated_at, notes: lead.notes },
    activities: data.activities,
    followUps: data.followUps,
    stageHistory: data.stageHistory,
    rfqs: data.rfqs,
    quotes: normalizedQuotes,
    complianceItems: data.complianceItems.map((item) => ({ ...item, reviewer_name: item.reviewer_user_id ? ownerMap.get(item.reviewer_user_id) ?? null : null })),
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

  const sortedQuotes = sortQuotesNewestFirst(data.quotes as any[]);
  const activeQuote = requestedQuoteId ? sortedQuotes.find((quote) => quote.id === requestedQuoteId) ?? sortedQuotes[0] ?? null : sortedQuotes[0] ?? null;
  const activeQuoteStatus = String(activeQuote?.status ?? '').toLowerCase();
  const activeQuoteIsTerminal = activeQuote ? TERMINAL_QUOTE_STATUSES.has(activeQuoteStatus) : false;
  const quoteCount = data.quotes.length;
  const openQuoteCount = data.quotes.filter((quote) => OPEN_QUOTE_STATUSES.has(String(quote.status ?? '').toLowerCase()) || !TERMINAL_QUOTE_STATUSES.has(String(quote.status ?? '').toLowerCase())).length;
  const terminalQuoteCount = data.quotes.filter((quote) => TERMINAL_QUOTE_STATUSES.has(String(quote.status ?? '').toLowerCase())).length;
  const quoteVersionsWithApproval = enrichQuoteVersionsWithApprovals(data.quoteVersions, data.approvalRequests ?? []);

  return (
    <>
      <MobileSafeLeadQuoteSurface lead={lead} quoteCount={quoteCount} leadId={leadId} />
      <div className="hidden min-h-screen bg-slate-100 md:block">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-6 py-5">
          {quoteDraftError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">Quote draft action needs attention: {decodeURIComponent(quoteDraftError)}</div>
          ) : null}
          {mappedMarketCount === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">No markets mapped to this lead yet — pricing context will be limited.</div>
          ) : null}
          {readOnlyMessage ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-500">{readOnlyMessage}</div>
          ) : null}

          <div style={heroStyle}>
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">
                {lead.company_name.split(' ').filter(Boolean).slice(0, 2).map((word: string) => word[0]?.toUpperCase() ?? '').join('')}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-black tracking-tight">{lead.company_name}</h1>
                <p className="mt-1 text-xs font-semibold text-white/65">
                  {lead.lead_type === 'buyer' ? 'Buyer' : 'Supplier'}{data.linkedMarkets.length > 0 ? ` · ${(data.linkedMarkets as any[]).map((market) => market.name).join(', ')}` : ''} · {lead.deal_currency ?? 'USD'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(data.linkedProducts as any[]).slice(0, 4).map((product) => (
                    <span key={product.id} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-white/85">{product.name}</span>
                  ))}
                  {activeQuoteIsTerminal ? <span className="rounded-full border border-emerald-300/40 bg-emerald-400/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-emerald-100">Locked quote selected</span> : null}
                </div>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-2xl font-black">{quoteCount || '—'}</div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/50">Quotes on lead</div>
              <div className="mt-3 flex justify-end gap-2">
                <Link href={leadCommandHref} className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-black text-white">← Lead Detail</Link>
                <Link href="/orders" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-black text-white">Orders</Link>
              </div>
            </div>
          </div>

          <BuilderPrimaryPanel leadId={leadId} activeQuote={activeQuote} blockerCount={quoteSendGuard.blockerCount} blockerReasons={quoteSendGuard.blockerReasons} requestedQuoteId={requestedQuoteId} />

          <section id="quote-history" className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Quote history</p>
                  <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950">Commercial records stay preserved</h2>
                </div>
                <div className="flex gap-2 text-xs font-black text-slate-500">
                  <span className="rounded-full bg-slate-100 px-3 py-1">{openQuoteCount} open</span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">{terminalQuoteCount} locked</span>
                </div>
              </div>
              <div className="grid gap-3">
                {sortedQuotes.length ? sortedQuotes.map((quote) => {
                  const status = String(quote.status ?? '').toLowerCase();
                  const locked = TERMINAL_QUOTE_STATUSES.has(status);
                  return (
                    <div key={quote.id} className={`rounded-2xl border p-4 ${quote.id === activeQuote?.id ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Quote {quote.id.slice(0, 8)}</p>
                          <p className="mt-1 text-sm font-black text-slate-950">{titleCase(status || 'draft')}{locked ? ' · Locked' : ' · Working'}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/leads/${leadId}/quote?quoteId=${quote.id}`} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700">{locked ? 'View Locked Quote' : 'Open Current Quote'}</Link>
                          {locked ? <QuoteDraftForm leadId={leadId} sourceQuoteId={quote.id} label="Create New Quote" forceNew primary={false} /> : null}
                        </div>
                      </div>
                    </div>
                  );
                }) : <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm font-semibold text-slate-500">No quote history yet.</p>}
              </div>
            </div>

            <QuoteVersionRail
              versions={quoteVersionsWithApproval}
              leadId={leadId}
              currentVersionId={activeQuote?.current_version_id ?? null}
              sentVersionId={activeQuote?.sent_version_id ?? null}
            />
          </section>

          <details className="group rounded-[1.4rem] border border-slate-200 bg-white shadow-sm">
            <summary className="cursor-pointer list-none px-5 py-4 text-sm font-black text-slate-800 marker:hidden">
              Advanced / legacy quote workspace <span className="font-semibold text-slate-400">— collapsed to keep the five-step builder primary</span>
            </summary>
            <div className="border-t border-slate-100 p-5">
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
                canApproveAsAdmin={canApproveAsAdmin}
                readOnlyMessage={readOnlyMessage}
                sendReadOnlyMessage={sendReadOnlyMessage}
                rfqWorkspaceHref={`/leads/${leadId}/rfq/new`}
                pricingSnapshot={pricingSnapshot}
                quoteVersions={quoteVersionsWithApproval}
                negotiationEvents={data.negotiationEvents}
                pricingEngineThresholdPercent={pricingEngineThresholdPercent}
                communications={data.communications.filter((item: any) => item.quote_id || item.related_entity === 'quote').map((item: any) => ({
                  id: item.id,
                  quote_id: item.quote_id,
                  related_entity: item.related_entity,
                  related_id: item.related_id,
                  subject: item.subject,
                  summary: item.summary,
                  status: item.status,
                  created_at: item.created_at,
                  sent_at: item.sent_at,
                  draft_source: item.draft_source,
                  metadata: item.metadata,
                }))}
              />
            </div>
          </details>

          <div className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-black tracking-tight text-slate-950">Commercial timeline</h3>
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Lead · RFQ · Quote · Compliance</span>
            </div>
            <ActivityTimeline events={timelineEvents} emptyLabel="No commercial activity logged yet." />
          </div>
        </div>
      </div>
    </>
  );
}
