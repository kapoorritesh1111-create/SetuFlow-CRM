import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StateMessage } from '@/components/ui/state-message';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { buildQuotesPageViewModel } from '@/features/quotes/logic/build-quotes-page-view-model';
import { scoreQuoteRisk } from '@/features/ai/logic/intelligence';
import { AIInsightCard } from '@/features/ai/ui/intelligence-panels';
import { QuoteListItem } from '@/features/quotes/ui/quote-list-item';
import { QuoteHistoryList } from '@/features/quotes/ui/quote-history-list';
import { getCommercialLockStateLabel, parseContractCommercialSnapshot } from '@/lib/contract-lock';
import { inferQuoteTradeWorkflow, journeyLabel } from '@/features/trade-workflow/logic';
import { TradeSignalGrid } from '@/features/trade-workflow/ui';

function readSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default async function QuotesPage({ searchParams }: { searchParams?: { quoteId?: string | string[] } }) {
  let workspace: Awaited<ReturnType<typeof getWorkspaceAccess>> | null = null;

  try {
    workspace = await getWorkspaceAccess();
  } catch {
    return <EmptyState title="Workspace unavailable" description="We were unable to load your workspace. Please refresh or try again later." />;
  }

  if (!hasSupabaseEnv || workspace?.missingEnv) {
    return <EmptyState title="Configuration required" description="SETU Flow needs Supabase environment values before the quotes workspace can load." />;
  }

  if (!workspace?.organization) {
    return <EmptyState title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded." />;
  }

  const supabase = await createClient();
  const db = supabase as any;
  const organizationId = workspace.organization.id;
  const selectedQuoteId = readSearchParam(searchParams?.quoteId).trim() || null;

  const quotesResult = await db
    .from('quotes')
    .select('id, lead_id, status, currency, notes, quote_number, created_at, updated_at, current_version_id')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .limit(200);

  if (quotesResult.error) {
    return <EmptyState title="Could not load quotes" description={String(quotesResult.error.message ?? 'Unknown error')} />;
  }

  const quotes = Array.isArray(quotesResult.data) ? quotesResult.data : [];
  if (!quotes.length) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <PageHeader
          eyebrow="Quote"
          title="Quote desk"
          description="Quote is now a core operating desk. Start governed commercial work from a qualified lead, then monitor draft, review, history, and order handoff here."
          actions={[{ label: 'Open Follow-up', href: PRODUCT_ROUTES.app.leads, type: 'primary' }, { label: 'Open Orders / Execution', href: PRODUCT_ROUTES.app.orders }]}
        />
        <SectionCard eyebrow="No quotes yet" title="Create the first live quote from a qualified lead" description="This workspace will show quote list, detail, history, and order handoff once commercial work starts.">
          <Link href={PRODUCT_ROUTES.app.leads} className="inline-flex rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Go to Follow-up</Link>
        </SectionCard>
      </div>
    );
  }

  const leadIds = [...new Set(quotes.map((quote: any) => quote.lead_id).filter(Boolean))];
  const quoteIds = quotes.map((quote: any) => quote.id);

  const [leadsResult, versionsResult, negotiationsResult, communicationsResult, contractsResult] = await Promise.all([
    db.from('leads').select('id, company_name, contact_name, lead_type').eq('organization_id', organizationId).in('id', leadIds),
    db.from('quote_versions').select('id, quote_id, version_no, status, created_at, approved_at, sent_at').in('quote_id', quoteIds).order('created_at', { ascending: false }),
    db.from('quote_negotiation_events').select('id, quote_id, event_type, message, created_at, actor_name').in('quote_id', quoteIds).order('created_at', { ascending: false }),
    db.from('communications').select('id, quote_id, subject, summary, status, created_at').in('quote_id', quoteIds).order('created_at', { ascending: false }),
    db.from('contracts').select('id, quote_id, status, signed_at, starts_on, commercial_lock_state, commercial_snapshot').eq('organization_id', organizationId).in('quote_id', quoteIds),
  ]);

  const viewModel = buildQuotesPageViewModel({
    quotes,
    leads: Array.isArray(leadsResult.data) ? leadsResult.data : [],
    versions: Array.isArray(versionsResult.data) ? versionsResult.data : [],
    negotiations: Array.isArray(negotiationsResult.data) ? negotiationsResult.data : [],
    communications: Array.isArray(communicationsResult.data) ? communicationsResult.data : [],
    contracts: Array.isArray(contractsResult.data) ? contractsResult.data : [],
    selectedQuoteId,
  });

  const selected = viewModel.selectedItem;
  const selectedLeadHref = selected ? `/leads/${selected.leadId}/quote?quoteId=${selected.id}` : PRODUCT_ROUTES.app.leads;
  const selectedTrade = selected
    ? inferQuoteTradeWorkflow({ leadType: selected.leadType, notes: selected.notes, hasAcceptedContract: selected.hasAcceptedContract })
    : null;
  const selectedContractSnapshot = selected?.contract ? parseContractCommercialSnapshot((selected.contract as any).commercial_snapshot) : null;
  const selectedQuoteRisk = selected
    ? scoreQuoteRisk({
        quoteId: selected.id,
        companyName: selected.companyName,
        status: selected.status,
        updatedAt: selected.updatedAt,
        notes: selected.notes,
        leadType: selected.leadType,
        totalVersions: selected.totalVersions,
        negotiationCount: selected.negotiationCount,
        hasAcceptedContract: selected.hasAcceptedContract,
        communicationCount: Math.max(0, selected.historyCount - selected.totalVersions - selected.negotiationCount),
      })
    : null;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <StateMessage
        tone="neutral"
        title="Quotes is now a core operating workspace"
        description="Use the list to select a live commercial record, review detail and history in one place, and jump into the full lead-owned builder only when deeper pricing or send work is required."
      />

      <PageHeader
        eyebrow="Quote"
        title="Quote desk"
        description="Monitor live quote activity with list, detail, governed pricing context, history, and order handoff visibility in one route."
        actions={[
          { label: 'Open Follow-up', href: PRODUCT_ROUTES.app.leads },
          { label: 'Open Orders / Execution', href: PRODUCT_ROUTES.app.orders },
          { label: 'Open full builder', href: selectedLeadHref, type: 'primary' },
        ]}
      />

      {selectedTrade ? (
        <TradeSignalGrid
          title="Trade workflow visibility"
          signals={[
            { label: 'Buyer / supplier mode', value: journeyLabel(selectedTrade.journey), tone: 'neutral', detail: 'The quote keeps commercial context anchored to the same operating lane used in leads and pipeline.' },
            { label: 'Incoterm posture', value: selectedTrade.incotermLabel, tone: selectedTrade.incotermLabel === 'Not set' ? 'warning' : 'success', detail: 'Incoterm visibility is derived from the quote pricing basis and should stay explicit before send or handoff.' },
            { label: 'Quote to order handoff', value: selectedTrade.handoffLabel, tone: selectedTrade.handoffLabel === 'Order handoff active' ? 'success' : 'warning', detail: 'Accepted commercial work should stay visible as it moves into the order and execution lanes.' },
          ]}
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-4">
        <SectionCard eyebrow="Queue" title="Quote list" description="Pick one active commercial record to review.">
          <div className="space-y-3">
            {viewModel.items.map((item) => <QuoteListItem key={item.id} item={item} selected={selected?.id === item.id} />)}
          </div>
        </SectionCard>

        <div className="xl:col-span-2 space-y-4">
          <SectionCard eyebrow="Detail" title={selected ? selected.companyName : 'No quote selected'} description="Commercial posture, current state, and builder handoff stay visible together.">
            {selected ? (
              <div className="space-y-4 text-sm text-slate-600">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Current quote</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{selected.quoteNumber ?? selected.id.slice(0, 8)}</p>
                    <p className="mt-1">Status: <span className="font-medium text-slate-900">{selected.status.replaceAll('_', ' ')}</span></p>
                    <p className="mt-1">Currency: <span className="font-medium text-slate-900">{selected.currency ?? 'Not set'}</span></p>
                    <p className="mt-1">Mode: <span className="font-medium text-slate-900">{journeyLabel(selected.leadType)}</span></p>
                    <p className="mt-1">Incoterm: <span className="font-medium text-slate-900">{selectedTrade?.incotermLabel ?? 'Not set'}</span></p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Builder access</p>
                    <p className="mt-2">Use the full lead-owned builder when pricing lines, send gate, approval posture, or revision detail need deeper edits.</p>
                    <Link href={selectedLeadHref} className="mt-3 inline-flex rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Open builder</Link>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">History</p>
                    <p className="mt-2 text-slate-900">{selected.historyCount} timeline events across versions, negotiation, and communications.</p>
                    <p className="mt-1">{selected.negotiationCount} negotiation updates and {selected.totalVersions} recorded versions.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Quote to contract handoff</p>
                    <p className="mt-2 text-slate-900">{selected.hasAcceptedContract ? 'A contract-grade handoff already exists for this quote.' : 'No contract-grade handoff exists yet for this quote.'}</p>
                    <p className="mt-1">Accepted work should move forward only after commercial acceptance is real, the incoterm is explicit, and operator ownership is clear.</p>
                    {selectedContractSnapshot ? <p className="mt-2 text-xs text-slate-500">{getCommercialLockStateLabel((selected.contract as any).commercial_lock_state ?? selectedContractSnapshot.lockState)} · {selectedContractSnapshot.pricingBasis ?? 'pricing basis pending'} · {selectedContractSnapshot.lineCount ?? 0} locked lines</p> : null}
                  </div>
                </div>
                {selectedQuoteRisk ? <AIInsightCard title={selectedQuoteRisk.label} score={selectedQuoteRisk.score} level={selectedQuoteRisk.level} reasons={selectedQuoteRisk.reasons} /> : null}
                {selected.notes ? <div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Notes</p><p className="mt-2">{selected.notes}</p></div> : null}
              </div>
            ) : <p className="text-sm text-slate-500">Choose a quote from the list to review detail.</p>}
          </SectionCard>

          <SectionCard eyebrow="History" title="Version and negotiation history" description="Keep commercial movement visible before jumping into the full builder.">
            <QuoteHistoryList items={viewModel.selectedHistory} />
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard eyebrow="Workspace summary" title="Commercial posture" description="The quotes route now acts as an operating surface, not a launchpad.">
            <div className="space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Total quotes</p><p className="mt-2 text-2xl font-semibold text-slate-900">{viewModel.summary.totalQuotes}</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Active quotes</p><p className="mt-2 text-2xl font-semibold text-slate-900">{viewModel.summary.activeQuotes}</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Accepted quotes</p><p className="mt-2 text-2xl font-semibold text-slate-900">{viewModel.summary.acceptedQuotes}</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Order handoff visible</p><p className="mt-2 text-2xl font-semibold text-slate-900">{viewModel.summary.contractReadyQuotes}</p></div>
            </div>
          </SectionCard>

          <SectionCard eyebrow="Operating rule" title="When to use this route" description="Review and triage here. Edit deeply from the lead-owned builder.">
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>Use the list to keep one live quote in focus.</li>
              <li>Use detail to review status, history, and handoff readiness.</li>
              <li>Use the full builder for pricing, send-gate, and revision work.</li>
              <li>Use Orders only after accepted commercial work is real.</li>
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
