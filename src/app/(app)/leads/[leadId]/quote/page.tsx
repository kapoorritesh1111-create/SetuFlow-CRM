import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getLeadProfileData } from '@/lib/queries/leads';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import QuotePrintButton from '@/features/leads/components/quote-print-button';
import { QuoteWorkspace } from '@/features/quotes/components/quote-workspace';
import QuoteVersionRail from '@/features/quotes/quote-builder/QuoteVersionRail';
import { ComplianceCheckPopover } from '@/features/compliance/components/compliance-check-popover';
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

function MobileSafeLeadQuoteSurface({
  lead,
  linkedProducts,
  linkedMarkets,
  quoteCount,
  blockerCount,
  leadId,
}: {
  lead: any;
  linkedProducts: any[];
  linkedMarkets: any[];
  quoteCount: number;
  blockerCount: number;
  leadId: string;
}) {
  const productLabel = linkedProducts?.[0]?.name ?? 'Select product';
  const marketLabel = linkedMarkets?.[0]?.name ?? lead.country ?? 'Select market';
  const currency = lead.deal_currency ?? 'USD';
  const amount = typeof lead.deal_value === 'number' && lead.deal_value > 0 ? lead.deal_value : 0;
  const estimate = amount > 0 ? `${currency} ${amount.toLocaleString()}` : `${currency} draft`;

  return (
    <section className="min-h-screen bg-[#071327] px-4 pb-32 pt-5 text-white md:hidden">
      <div className="rounded-[2rem] bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,.35),rgba(15,23,42,0)_38%),linear-gradient(145deg,#0c172d,#10284c)] p-5 shadow-[0_24px_80px_rgba(0,0,0,.28)]">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">Mobile quote</p>
        <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight">{lead.company_name}</h1>
        <p className="mt-2 text-sm font-semibold text-white/70">{lead.lead_type === 'supplier' ? 'Supplier' : 'Buyer'} · {marketLabel}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-white/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/55">Quotes</p>
            <b className="mt-1 block text-3xl font-black">{quoteCount}</b>
          </div>
          <div className="rounded-3xl bg-white/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/55">Readiness</p>
            <b className="mt-1 block text-xl font-black">{blockerCount > 0 ? `${blockerCount} blockers` : 'Ready'}</b>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[2rem] border border-white/10 bg-white p-5 text-slate-950 shadow-xl shadow-black/15">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Fast quote editor</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight">Build quote on the go</h2>
        <div className="mt-5 grid gap-3">
          <label className="grid gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Product</span>
            <div className="min-h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold">{productLabel}</div>
          </label>
          <label className="grid gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Market</span>
            <div className="min-h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold">{marketLabel}</div>
          </label>
          <label className="grid gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Quantity</span>
            <input inputMode="numeric" placeholder="Enter quantity" className="min-h-14 rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold outline-none focus:border-blue-500" />
          </label>
          <div className="rounded-3xl bg-blue-50 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">Current estimate</p>
            <b className="mt-1 block text-3xl font-black text-slate-950">{estimate}</b>
            <p className="mt-2 text-sm text-slate-500">Use this mobile view for quick quote checks. Full advanced controls remain available on desktop.</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link href={`/leads/${leadId}`} className="flex min-h-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-900">Open lead</Link>
          <Link href="/orders" className="flex min-h-14 items-center justify-center rounded-2xl bg-blue-600 text-sm font-black text-white">View orders</Link>
        </div>
      </div>

      <div className="mt-4 rounded-[2rem] border border-white/10 bg-white/8 p-5 text-white">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">Next steps</p>
        <ul className="mt-3 space-y-3 text-sm text-white/75">
          <li>• Confirm product and quantity.</li>
          <li>• Check readiness blockers before sending.</li>
          <li>• Continue on desktop only for advanced approval and send controls.</li>
        </ul>
      </div>
    </section>
  );
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
  const coverageSelections = Array.isArray((workflow as any).coverageSelections) ? (workflow as any).coverageSelections : [];
  const categoryOnlyInterestCount = coverageSelections.filter((item: any) => item?.interestType === 'category_only').length;
  const confirmedInterestCount = coverageSelections.filter((item: any) => item?.interestType === 'confirmed_product').length;
  const contracts = Array.isArray(data.contracts) ? data.contracts : [];
  const mappingNote = typeof workflow.productMappingNotes === 'string' ? workflow.productMappingNotes : '';

  const canManageQuotes = hasWorkspaceCapability(workspace.currentRoles, 'lead.manage');
  const canSendQuotes = hasWorkspaceCapability(workspace.currentRoles, 'quote.send');
  const readOnlyMessage = getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage');
  const sendReadOnlyMessage = getReadOnlyWorkspaceMessage(workspace.currentRoles, 'quote.send');
  // Admin and owner can approve any quote regardless of approval posture
  const canApproveAsAdmin = (workspace.currentRoles ?? []).some((r: string) => ['owner', 'admin'].includes(r));
  const requestedQuoteId = readSearchParam(searchParams?.quoteId).trim() || null;
  // S37-UX-010: point back to the dedicated Lead Detail route, not the retired inline view.
  const leadCommandHref = `/leads/${params.leadId}`;

  // S37-UX-010 (fix): the qualification + product-mapping gates apply to CREATING a first quote.
  // If the lead already has a quote, "Open Current Quote" must always work — viewing an existing
  // version is never blocked. New-quote creation stays gated server-side by app_create_lead_quote_draft_tx.
  const hasExistingQuote = Array.isArray(data.quotes) && data.quotes.length > 0;

  if (!hasExistingQuote && qualificationStatus !== 'qualified') {
    return (
      <EmptyState
        title="Qualification required"
        description="This lead must be qualified before the first quote can be created. Open the lead, use Qualify & Map to confirm qualification and product/category interest, then return here."
      />
    );
  }

  if (!hasExistingQuote && mappedProductCount === 0) {
    return (
      <EmptyState
        title="Product mapping required"
        description="Link at least one structured product or category-backed product interest to this qualified lead before creating its first quote."
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

  const supabase = await createClient();
  const { data: pricingEngineSettings } = await (supabase as any)
    .from('pricing_engine_settings')
    .select('approval_threshold_percent')
    .eq('organization_id', workspace.organization.id)
    .maybeSingle();
  const pricingEngineThresholdPercent =
    typeof pricingEngineSettings?.approval_threshold_percent === 'number'
      ? pricingEngineSettings.approval_threshold_percent
      : null;

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
  const activeQuote = requestedQuoteId ? data.quotes.find((quote) => quote.id === requestedQuoteId) ?? data.quotes[0] ?? null : data.quotes[0] ?? null;
  const activeQuoteId = activeQuote?.id ?? requestedQuoteId;
  const activeQuoteLabel = activeQuoteId ? activeQuoteId.slice(0, 8) : 'current quote';
  const quoteVersionsWithApproval = enrichQuoteVersionsWithApprovals(data.quoteVersions, data.approvalRequests ?? []);

  return (
    <>
      <MobileSafeLeadQuoteSurface lead={lead} linkedProducts={data.linkedProducts as any[]} linkedMarkets={data.linkedMarkets as any[]} quoteCount={quoteCount} blockerCount={quoteSendGuard.blockerCount} leadId={leadId} />
      <div className="hidden md:block" style={{ background: '#f0f4f8', minHeight: '100vh' }}>
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {missingMarketCoverage ? (
          <div style={{ padding: '10px 16px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fde68a', fontSize: '12px', color: '#92400e', fontWeight: 600 }}>
            No markets mapped to this lead yet — pricing context will be limited.
          </div>
        ) : null}
        {readOnlyMessage ? (
          <div style={{ padding: '10px 16px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>{readOnlyMessage}</div>
        ) : null}

        {/* Hero — spec .qb-hero */}
        <div style={{ background: 'linear-gradient(135deg,#061c2e 0%,#0b2e4a 55%,#1a5fa0 100%)', borderRadius: '22px', padding: '18px 22px', color: 'white', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'linear-gradient(135deg,#1a5fa0,#0c7fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: 'white', flexShrink: 0 }}>
              {lead.company_name.split(' ').filter(Boolean).slice(0,2).map((w: string) => w[0]?.toUpperCase() ?? '').join('')}
            </div>
            <div>
              <div style={{ fontSize: '19px', fontWeight: 800, letterSpacing: '-.4px', marginBottom: '3px' }}>{lead.company_name}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.6)', lineHeight: 1.55 }}>
                {lead.lead_type === 'buyer' ? 'Buyer' : 'Supplier'}
                {data.linkedMarkets.length > 0 ? ` · ${(data.linkedMarkets as any[]).map((m) => m.name).join(', ')}` : ''}
                {' · '}{lead.deal_currency ?? 'USD'}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '7px' }}>
                {(data.linkedProducts as any[]).slice(0,3).map((p) => (
                  <span key={p.id} style={{ padding: '2px 9px', borderRadius: '999px', fontSize: '9px', fontWeight: 700, background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.18)', color: 'rgba(255,255,255,.85)', letterSpacing: '.04em', textTransform: 'uppercase' as const }}>{p.name}</span>
                ))}
                {quoteSendGuard.blockerCount > 0 && (
                  <span style={{ padding: '2px 9px', borderRadius: '999px', fontSize: '9px', fontWeight: 700, background: 'rgba(217,119,6,.25)', border: '1px solid rgba(217,119,6,.5)', color: '#fde68a' }}>
                    {quoteSendGuard.blockerCount} send blocker{quoteSendGuard.blockerCount === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-.5px' }}>
              {data.quotes.length === 0 ? '—' : `${data.quotes.length} quote${data.quotes.length === 1 ? '' : 's'}`}
            </div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,.5)', letterSpacing: '.12em', textTransform: 'uppercase' as const, marginTop: '2px' }}>Draft total</div>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <Link href={leadCommandHref} style={{ padding: '5px 12px', borderRadius: '6px', background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', color: 'white', fontSize: '10px', fontWeight: 700, textDecoration: 'none' }}>
                ← Back to CC
              </Link>
              <Link href="/orders" style={{ padding: '5px 12px', borderRadius: '6px', background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', color: 'white', fontSize: '10px', fontWeight: 700, textDecoration: 'none' }}>
                Orders
              </Link>
            </div>
          </div>
        </div>

        {/* 5-step stepper — spec .qb-stepper */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '22px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(15,23,42,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Quote Builder</div>
            <div style={{ fontSize: '9px', fontWeight: 700, padding: '2px 9px', borderRadius: '999px', background: 'rgba(12,127,255,.08)', border: '1px solid rgba(12,127,255,.2)', color: '#0c7fff', letterSpacing: '.08em', textTransform: 'uppercase' as const }}>
              {data.quotes.length === 0 ? 'Ready to start' : `${openQuoteCount} active`}
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '10px', color: '#94a3b8' }}>
              Capture → Lead → <strong style={{ color: '#0b2e4a' }}>Quote</strong> → Order
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative', marginBottom: '12px' }}>
            {([
              { label: 'Product', done: mappedProductCount > 0, cur: mappedProductCount === 0, n: 1 },
              { label: 'Pricing', done: false, cur: mappedProductCount > 0 && data.quotes.length === 0, n: 2 },
              { label: 'Terms', done: false, cur: false, n: 3 },
              { label: 'Review', done: false, cur: false, n: 4 },
              { label: 'Send gate', done: false, cur: false, n: 5 },
            ] as const).map((step, i) => {
              const circleStyle = step.done
                ? { background: '#059669', color: 'white', boxShadow: '0 0 0 3px #d1fae5' }
                : step.cur
                  ? { background: '#0b2e4a', color: 'white', boxShadow: '0 0 0 3px rgba(11,46,74,.1)' }
                  : { background: 'white', color: '#94a3b8', border: '2px solid #e2e8f0' };
              const labelColor = step.done ? '#059669' : step.cur ? '#0b2e4a' : '#94a3b8';
              return (
                <div key={step.n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, ...circleStyle }}>
                      {step.done ? '✓' : step.n}
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: 700, textAlign: 'center', color: labelColor }}>{step.label}</div>
                  </div>
                  {i < 4 ? <div style={{ height: '2px', flex: 1, background: step.done ? '#059669' : '#e2e8f0', alignSelf: 'flex-start', marginTop: '14px' }} /> : null}
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.6, padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', borderLeft: '3px solid #0c7fff' }}>
            <strong style={{ color: '#1e293b' }}>Quote workspace:</strong>{' '}
            {data.quotes.length === 0
              ? 'Create a quote draft below. Catalog pricing pre-fills from your reference data.'
              : quoteSendGuard.blockerCount > 0
                ? `${openQuoteCount} open · ${quoteSendGuard.blockerCount} blocker${quoteSendGuard.blockerCount === 1 ? '' : 's'} to clear before send.`
                : `${openQuoteCount} open · Ready to move through review and send.`}
          </div>
          {quoteSendGuard.blockerCount > 0 && activeQuoteId ? (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-700">Compliance check</p>
                  <p className="mt-1 text-sm font-semibold text-rose-950">Quote Review is blocked until the source-of-truth compliance gate clears.</p>
                  <p className="mt-1 text-sm leading-6 text-rose-800">Open the check window here to attach evidence, waive for quote, or defer to dispatch without leaving Quote Builder.</p>
                </div>
                <ComplianceCheckPopover
                  leadId={leadId}
                  quoteId={activeQuoteId}
                  triggerLabel="Compliance check"
                  title="Quote Review compliance check"
                  contextLabel={`Quote Builder · ${activeQuoteLabel}`}
                  blockerReasons={quoteSendGuard.blockerReasons}
                />
              </div>
            </div>
          ) : null}
        </div>

        {/* Quote workspace */}
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
            id: item.id, quote_id: item.quote_id, related_entity: item.related_entity, related_id: item.related_id,
            subject: item.subject, summary: item.summary, status: item.status, created_at: item.created_at,
            sent_at: item.sent_at, draft_source: item.draft_source, metadata: item.metadata,
          }))}
        />

        {/* S37-UX-010: premium version history + approval posture + Setu Guru rail */}
        <QuoteVersionRail
          versions={quoteVersionsWithApproval}
          leadId={leadId}
          currentVersionId={activeQuote?.current_version_id ?? null}
          sentVersionId={activeQuote?.sent_version_id ?? null}
        />

        {/* Commercial timeline */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px 22px', boxShadow: '0 1px 3px rgba(15,23,42,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Commercial timeline</h3>
            <span style={{ fontSize: '9px', textTransform: 'uppercase' as const, letterSpacing: '.16em', color: '#94a3b8' }}>Lead · RFQ · Quote · Compliance</span>
          </div>
          <ActivityTimeline events={timelineEvents} emptyLabel="No commercial activity logged yet." />
        </div>

      </div>
    </div>
    </>
  );

}