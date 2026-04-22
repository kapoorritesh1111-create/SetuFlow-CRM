import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionCard } from '@/components/ui/section-card';
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

function labelizeStatus(value: string) {
  return value.replaceAll('_', ' ');
}

function nextStepToneClasses(tone: 'quote' | 'approval' | 'orders' | 'follow_up') {
  if (tone === 'orders') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (tone === 'approval') return 'border-amber-200 bg-amber-50 text-amber-900';
  if (tone === 'follow_up') return 'border-sky-200 bg-sky-50 text-sky-800';
  return 'border-slate-200 bg-slate-50 text-slate-800';
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
        <SectionCard eyebrow="Quote command center" title="No quotes yet" description="Start the first governed commercial thread from Follow-up once the lead is qualified and commercially coherent.">
          <div className="flex flex-wrap items-center gap-3">
            <Link href={PRODUCT_ROUTES.app.leads} className="inline-flex rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Open Follow-up</Link>
            <Link href={PRODUCT_ROUTES.app.orders} className="text-sm font-semibold text-brand-700 hover:text-brand-800">Orders</Link>
          </div>
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
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Quote command center</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Keep Follow-up and Quote in one governed working set</h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">This route keeps one quote in focus. Start from catalog pricing, make override reasons visible, and only hand off into Approvals & Sending when the quote is actually ready to send.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={selectedLeadHref} className="inline-flex rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Edit this quote</Link>
            <Link href={PRODUCT_ROUTES.app.leads} className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50">Back to Follow-up</Link>
            <Link href={PRODUCT_ROUTES.app.integrations} className="text-sm font-semibold text-brand-700 hover:text-brand-800">Approvals &amp; Sending</Link>
          </div>
        </div>

        {selected ? (
          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,.85fr)]">
            <div className={`rounded-[24px] border p-5 ${nextStepToneClasses(selected.nextStep.tone)}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">Next move</span>
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">{labelizeStatus(selected.status)}</span>
                {selected.quoteNumber ? <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">{selected.quoteNumber}</span> : null}
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{selected.nextStep.label}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-700">{selected.nextStep.detail}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link href={selected.nextStep.href} className="inline-flex rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Go to next move</Link>
                <Link href={selectedLeadHref} className="text-sm font-semibold text-slate-700 hover:text-slate-900">Edit this quote</Link>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Active quotes</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{viewModel.summary.activeQuotes}</p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Accepted handoffs</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{viewModel.summary.contractReadyQuotes}</p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Total queue</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{viewModel.summary.totalQuotes}</p>
              </div>
            </div>
          </div>
        ) : null}
      </section>

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

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
        <SectionCard eyebrow="Queue" title="Live quote queue" description="Pick one commercial record and keep the next move obvious.">
          <div className="space-y-3">
            {viewModel.items.map((item) => <QuoteListItem key={item.id} item={item} selected={selected?.id === item.id} />)}
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard eyebrow="Focused record" title={selected ? selected.companyName : 'No quote selected'} description="One stronger command-center pattern: current state, next move, history, and handoff truth together.">
            {selected ? (
              <div className="space-y-4 text-sm text-slate-600">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Current quote</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{selected.quoteNumber ?? selected.id.slice(0, 8)}</p>
                    <p className="mt-1">Status: <span className="font-medium text-slate-900">{labelizeStatus(selected.status)}</span></p>
                    <p className="mt-1">Currency: <span className="font-medium text-slate-900">{selected.currency ?? 'Not set'}</span></p>
                    <p className="mt-1">Mode: <span className="font-medium text-slate-900">{journeyLabel(selected.leadType)}</span></p>
                    <p className="mt-1">Incoterm: <span className="font-medium text-slate-900">{selectedTrade?.incotermLabel ?? 'Not set'}</span></p>
                  </div>
                  <div className={`rounded-2xl border p-4 ${nextStepToneClasses(selected.nextStep.tone)}`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Explicit operator path</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{selected.nextStep.label}</p>
                    <p className="mt-2">{selected.nextStep.detail}</p>
                    <Link href={selected.nextStep.href} className="mt-3 inline-flex rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">Go there now</Link>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">History and response pressure</p>
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

          <SectionCard eyebrow="Record history" title="Version and negotiation history" description="History stays under the focused record instead of becoming a competing summary surface.">
            <QuoteHistoryList items={viewModel.selectedHistory} />
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard eyebrow="Command-center rule" title="When this route should win" description="Quote stays close to Follow-up, but it should not behave like a detached product.">
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>Use this desk to keep one live commercial record in focus.</li>
              <li>Use the quote editor only when pricing lines, revisions, or sending details need deeper edits.</li>
              <li>Push accepted work into Orders instead of lingering here.</li>
              <li>Push rejected or stalled work back into explicit Follow-up action.</li>
            </ul>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Commercial truth reminder</p>
              <p className="mt-2 text-sm text-slate-700">Catalog/base pricing stays the default. Override requires an explicit reason. Threshold approvals still govern risky moves. AI can explain pressure and missing context, but it does not approve, send, or lock commercial terms.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={PRODUCT_ROUTES.app.products} className="inline-flex rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50">Open Catalog</Link>
                <Link href="/ai-suggestions?family=quote" className="inline-flex rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50">Open AI guidance</Link>
              </div>
            </div>
          </SectionCard>

          {selected ? (
            <SectionCard eyebrow="Governed contract" title="Commercial guardrails remain intact" description="PR-UX-02 compresses the workflow without weakening commercial governance.">
              <div className="space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 p-4">Catalog/base pricing remains the default source of truth.</div>
                <div className="rounded-2xl bg-slate-50 p-4">Any override still requires an explicit reason.</div>
                <div className="rounded-2xl bg-slate-50 p-4">Approval still remains mandatory once the configured threshold is met.</div>
              </div>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
