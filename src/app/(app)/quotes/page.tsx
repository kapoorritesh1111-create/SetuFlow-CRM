import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionCard } from '@/components/ui/section-card';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { buildQuotesPageViewModel } from '@/features/quotes/logic/build-quotes-page-view-model';
import { QuoteHistoryList } from '@/features/quotes/ui/quote-history-list';
import { formatQuoteMoney } from '@/features/quotes/logic/formatting';
import { cn, formatDateTime } from '@/lib/utils';
import { workspaceHeroClass, workspaceSecondaryButtonClass, workspacePrimaryButtonClass } from '@/components/ui/workspace-surfaces';
import { getQuoteStatusBadgeClasses } from '@/lib/quoteWorkflow';
import { buildApprovalSendHref, buildLeadQuoteHref, buildOrdersHref } from '@/lib/workflow/handoffs';

const FILTER_STATUSES = ['all', 'draft', 'internal_review', 'pending_approval', 'approved', 'sent', 'revised', 'accepted', 'rejected', 'expired'];
const FILTER_MODES = ['all', 'buyers', 'suppliers'];

type QuoteWorkspaceItem = ReturnType<typeof buildQuotesPageViewModel>['items'][number];

function readSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function labelizeStatus(value: string) {
  return value.replaceAll('_', ' ');
}

function readIsoDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Date.parse(`${trimmed}T00:00:00.000Z`);
  return Number.isFinite(parsed) ? parsed : null;
}

function nextStepToneClasses(tone: 'quote' | 'approval' | 'orders' | 'follow_up') {
  if (tone === 'orders') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (tone === 'approval') return 'border-amber-200 bg-amber-50 text-amber-900';
  if (tone === 'follow_up') return 'border-sky-200 bg-sky-50 text-sky-800';
  return 'border-slate-200 bg-slate-50 text-slate-800';
}

function getQuoteActionLabel(item: QuoteWorkspaceItem) {
  if (item.status === 'pending_approval') return 'Review';
  if (item.status === 'approved') return 'Send';
  if (item.status === 'accepted' || item.hasAcceptedContract) return 'Create order';
  if (item.status === 'draft' || item.status === 'revised' || item.status === 'internal_review') return 'Continue';
  if (item.status === 'sent') return 'Follow up';
  return 'Open';
}

function getValidityLabel(item: QuoteWorkspaceItem) {
  if (item.status === 'accepted' || item.hasAcceptedContract) return { label: 'Order ready', tone: 'text-emerald-700' };
  if (item.status === 'draft') return { label: 'Not sent', tone: 'text-slate-500' };
  if (item.status === 'expired') return { label: 'Expired', tone: 'text-rose-700' };
  const updatedAt = Date.parse(item.updatedAt);
  if (!Number.isFinite(updatedAt)) return { label: 'Validity unknown', tone: 'text-slate-500' };
  const daysSinceUpdate = Math.floor((Date.now() - updatedAt) / (24 * 60 * 60 * 1000));
  const daysLeft = Math.max(0, 30 - daysSinceUpdate);
  if (daysLeft <= 3) return { label: `${daysLeft} days left`, tone: 'text-rose-700' };
  if (daysLeft <= 7) return { label: `${daysLeft} days left`, tone: 'text-amber-700' };
  return { label: `${daysLeft} days left`, tone: 'text-slate-600' };
}

function filterItems(items: ReturnType<typeof buildQuotesPageViewModel>['items'], filters: { q: string; status: string; company: string; from: string; to: string; mode: string }) {
  const q = filters.q.trim().toLowerCase();
  const company = filters.company.trim().toLowerCase();
  const from = readIsoDate(filters.from);
  const to = readIsoDate(filters.to);
  const toEnd = to == null ? null : to + 24 * 60 * 60 * 1000 - 1;
  const status = filters.status === 'all' ? '' : filters.status;
  const mode = filters.mode === 'buyers' ? 'buyer' : filters.mode === 'suppliers' ? 'supplier' : '';

  return items.filter((item) => {
    const productNames = item.lineItems.map((line) => line.productName).join(' ');
    const haystack = `${item.quoteNumber ?? ''} ${item.id} ${item.companyName} ${productNames}`.toLowerCase();
    if (q && !haystack.includes(q)) return false;
    if (company && !item.companyName.toLowerCase().includes(company)) return false;
    if (status && item.status !== status) return false;
    if (mode && item.leadType !== mode) return false;
    const updatedAt = Date.parse(item.updatedAt);
    if (from != null && Number.isFinite(updatedAt) && updatedAt < from) return false;
    if (toEnd != null && Number.isFinite(updatedAt) && updatedAt > toEnd) return false;
    return true;
  });
}

function withQuoteParam(baseHref: string, quoteId: string, leadId: string) {
  const separator = baseHref.includes('?') ? '&' : '?';
  return `${baseHref}${separator}quoteId=${encodeURIComponent(quoteId)}&leadId=${encodeURIComponent(leadId)}`;
}

export default async function QuotesPage({ searchParams }: { searchParams?: { quoteId?: string | string[]; q?: string | string[]; status?: string | string[]; company?: string | string[]; from?: string | string[]; to?: string | string[]; mode?: string | string[] } }) {
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
  const requestedMode = readSearchParam(searchParams?.mode);
  const filters = {
    q: readSearchParam(searchParams?.q),
    status: FILTER_STATUSES.includes(readSearchParam(searchParams?.status)) ? readSearchParam(searchParams?.status) : 'all',
    company: readSearchParam(searchParams?.company),
    from: readSearchParam(searchParams?.from),
    to: readSearchParam(searchParams?.to),
    mode: FILTER_MODES.includes(requestedMode) ? requestedMode : 'all',
  };

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
        <SectionCard eyebrow="Quotes workspace" title="No quotes yet" description="Create the first quote from a qualified lead, then return here to manage status, approvals, versions, and send readiness.">
          <div className="flex flex-wrap items-center gap-3">
            <Link href={PRODUCT_ROUTES.app.leads} className={`inline-flex rounded-2xl px-4 py-2 text-sm font-semibold transition `}>+ New quote</Link>
            <Link href={PRODUCT_ROUTES.app.integrations} className="text-sm font-semibold text-brand-700 hover:text-brand-800">Approval Status</Link>
          </div>
        </SectionCard>
      </div>
    );
  }

  const leadIds = [...new Set(quotes.map((quote: any) => quote.lead_id).filter(Boolean))];
  const quoteIds = quotes.map((quote: any) => quote.id);

  const [leadsResult, versionsResult, negotiationsResult, communicationsResult, contractsResult, lineItemsResult] = await Promise.all([
    db.from('leads').select('id, company_name, contact_name, lead_type').eq('organization_id', organizationId).in('id', leadIds),
    db.from('quote_versions').select('id, quote_id, version_no, status, created_at, approved_at, sent_at').in('quote_id', quoteIds).order('created_at', { ascending: false }),
    db.from('quote_negotiation_events').select('id, quote_id, event_type, message, created_at, actor_name').in('quote_id', quoteIds).order('created_at', { ascending: false }),
    db.from('communications').select('id, quote_id, subject, summary, status, created_at').in('quote_id', quoteIds).order('created_at', { ascending: false }),
    db.from('contracts').select('id, quote_id, status, signed_at, starts_on, commercial_lock_state, commercial_snapshot').eq('organization_id', organizationId).in('quote_id', quoteIds),
    db.from('quote_line_items').select('id, quote_id, product_id, quantity, unit_price, currency, catalog_price_amount, catalog_price_currency, is_price_overridden, override_reason, notes').in('quote_id', quoteIds),
  ]);

  const lineItems = Array.isArray(lineItemsResult.data) ? lineItemsResult.data : [];
  const productIds = [...new Set(lineItems.map((line: any) => line.product_id).filter(Boolean))];
  const productsResult = productIds.length
    ? await db.from('products').select('id, name, sku').eq('organization_id', organizationId).in('id', productIds)
    : { data: [], error: null };

  const baseViewModelInput = {
    quotes,
    leads: Array.isArray(leadsResult.data) ? leadsResult.data : [],
    versions: Array.isArray(versionsResult.data) ? versionsResult.data : [],
    negotiations: Array.isArray(negotiationsResult.data) ? negotiationsResult.data : [],
    communications: Array.isArray(communicationsResult.data) ? communicationsResult.data : [],
    contracts: Array.isArray(contractsResult.data) ? contractsResult.data : [],
    lineItems,
    products: Array.isArray(productsResult.data) ? productsResult.data : [],
  };

  const viewModel = buildQuotesPageViewModel({ ...baseViewModelInput, selectedQuoteId });
  const filteredItems = filterItems(viewModel.items, filters);
  const selected = (selectedQuoteId ? viewModel.items.find((item) => item.id === selectedQuoteId) : null) ?? filteredItems[0] ?? viewModel.selectedItem;
  const selectedLeadHref = selected ? `/leads?leadId=${selected.leadId}&view=quote&quoteId=${selected.id}` : PRODUCT_ROUTES.app.leads;
  const selectedHistory = selected ? (selected.id === viewModel.selectedItem?.id ? viewModel.selectedHistory : buildQuotesPageViewModel({ ...baseViewModelInput, selectedQuoteId: selected.id }).selectedHistory) : [];
  const agedQuoteCount = viewModel.items.filter((item) => {
    if (['accepted', 'rejected', 'expired'].includes(item.status)) return false;
    const updatedAt = Date.parse(item.updatedAt);
    return Number.isFinite(updatedAt) && Date.now() - updatedAt >= 72 * 60 * 60 * 1000;
  }).length;
  const approvalQueue = viewModel.items.filter((item) => item.status === 'pending_approval');
  const approvalQueueCount = approvalQueue.length;
  const expiringSoonCount = viewModel.items.filter((item) => {
    const validity = getValidityLabel(item);
    return validity.tone.includes('rose') && item.status !== 'expired';
  }).length;
  const sentActiveCount = viewModel.items.filter((item) => ['sent', 'approved', 'negotiating'].includes(item.status)).length;
  const draftCount = viewModel.items.filter((item) => ['draft', 'internal_review', 'revised'].includes(item.status)).length;
  const acceptedCount = viewModel.items.filter((item) => item.status === 'accepted' || item.hasAcceptedContract).length;
  const totalValue = viewModel.items.reduce((sum, item) => sum + item.subtotal, 0);
  const selectedMode = selected?.leadType === 'buyer' ? 'buyers' : selected?.leadType === 'supplier' ? 'suppliers' : null;
  const selectedApprovalHref = selected ? buildApprovalSendHref({ queue: 'approvals', quoteId: selected.id, leadId: selected.leadId, handoff: 'quote-approval-status' }, selectedMode) : PRODUCT_ROUTES.app.integrations;
  const selectedSendHref = selected ? buildApprovalSendHref({ queue: 'send', quoteId: selected.id, leadId: selected.leadId, handoff: 'quote-ready-to-send' }, selectedMode) : PRODUCT_ROUTES.app.integrations;
  const selectedOrderHref = selected ? buildOrdersHref({ notice: 'quote-accepted', quoteId: selected.id, leadId: selected.leadId, handoff: 'quote-to-orders' }, selectedMode) : PRODUCT_ROUTES.app.orders;
  const firstApproval = approvalQueue[0];
  const secondApproval = approvalQueue[1];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <section className={cn(workspaceHeroClass, "p-5 sm:p-6")}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">Commercial</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Quotes Workspace</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">Quote list, approval queue, version history, FX context, and builder handoff stay in one operating view.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
              {FILTER_MODES.map((mode) => (
                <Link key={mode} href={`/quotes?mode=${mode}&status=${encodeURIComponent(filters.status)}&q=${encodeURIComponent(filters.q)}&company=${encodeURIComponent(filters.company)}&from=${encodeURIComponent(filters.from)}&to=${encodeURIComponent(filters.to)}`} className={`rounded-xl px-3 py-1.5 capitalize ${filters.mode === mode ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>{mode}</Link>
              ))}
            </div>
            <Link href="/quotes?export=csv" className={`inline-flex rounded-2xl px-4 py-2 text-sm font-semibold transition `}>Export</Link>
            <Link href={PRODUCT_ROUTES.app.leads} className={`inline-flex rounded-2xl px-4 py-2 text-sm font-semibold transition `}>+ New quote</Link>
          </div>
        </div>
      </section>

      <form className="grid gap-3 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(220px,1fr)_150px_150px_150px_150px_auto]" action="/quotes">
        <input type="hidden" name="mode" value={filters.mode} />
        <label className="text-sm font-medium text-slate-700">Search<input name="q" defaultValue={filters.q} placeholder="Search company, quote ref, product..." className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" /></label>
        <label className="text-sm font-medium text-slate-700">Status<select name="status" defaultValue={filters.status} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500">{FILTER_STATUSES.map((status) => <option key={status} value={status}>{status === 'all' ? 'All statuses' : labelizeStatus(status)}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-700">Company<input name="company" defaultValue={filters.company} placeholder="Company" className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" /></label>
        <label className="text-sm font-medium text-slate-700">From<input name="from" type="date" defaultValue={filters.from} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" /></label>
        <label className="text-sm font-medium text-slate-700">To<input name="to" type="date" defaultValue={filters.to} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" /></label>
        <button className="self-end rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800" type="submit">Apply</button>
      </form>

      <div className="flex flex-wrap items-center gap-2 rounded-[24px] border border-slate-200 bg-white p-4 text-xs font-semibold text-slate-600 shadow-sm">
        <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">Pending approval ({approvalQueueCount})</span>
        <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-800">Expiring soon ({expiringSoonCount})</span>
        <span className="ml-auto text-slate-500">{filteredItems.length} quotes · {formatQuoteMoney(totalValue, 'USD')} total value</span>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Pending approval</p><p className="mt-2 text-2xl font-semibold text-amber-800">{approvalQueueCount}</p><p className="text-xs text-amber-700">Waiting for review</p></div>
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">Expiring soon</p><p className="mt-2 text-2xl font-semibold text-rose-800">{expiringSoonCount}</p><p className="text-xs text-rose-700">Within 3 days</p></div>
        <div className="rounded-3xl border border-sky-200 bg-sky-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Sent & active</p><p className="mt-2 text-2xl font-semibold text-sky-800">{sentActiveCount}</p><p className="text-xs text-sky-700">Awaiting buyer response</p></div>
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Accepted</p><p className="mt-2 text-2xl font-semibold text-emerald-800">{acceptedCount}</p><p className="text-xs text-emerald-700">Order creation available</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Drafts</p><p className="mt-2 text-2xl font-semibold text-slate-900">{draftCount}</p><p className="text-xs text-slate-500">Not yet sent</p></div>
        <div className="rounded-3xl border border-violet-200 bg-violet-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Total value</p><p className="mt-2 text-xl font-semibold text-violet-800">{formatQuoteMoney(totalValue, 'USD')}</p><p className="text-xs text-violet-700">All active quotes</p></div>
      </div>

      {approvalQueueCount ? (
        <section className="rounded-[26px] border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
          <p className="font-semibold">{approvalQueueCount} quotes pending your approval — pricing override review required</p>
          <p className="mt-1 text-sm leading-6">Review overrides, approve or reject, and keep the send gate blocked until approval is logged.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {firstApproval ? <Link href={`/quotes?quoteId=${firstApproval.id}`} className="rounded-2xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800">Review {firstApproval.quoteNumber ?? firstApproval.id.slice(0, 8)} ({firstApproval.companyName})</Link> : null}
            {secondApproval ? <Link href={`/quotes?quoteId=${secondApproval.id}`} className="rounded-2xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100">Review {secondApproval.quoteNumber ?? secondApproval.id.slice(0, 8)} ({secondApproval.companyName})</Link> : null}
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,.75fr)]">
        <SectionCard eyebrow="Quote workspace" title="All quotes" description="Filter, search, and pick the quote that needs action.">
          <div className="mb-3 flex justify-end"><Link href="/quotes?bulk=1" className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Bulk action</Link></div>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="hidden grid-cols-[36px_1.35fr_.8fr_.55fr_.8fr_.75fr_.75fr_.7fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 lg:grid">
              <span></span><span>Company / ref</span><span>Status</span><span>Version</span><span className="text-right">Total value</span><span>Validity</span><span>Owner</span><span className="text-right">Action</span>
            </div>
            <div className="divide-y divide-slate-200">
              {filteredItems.length ? filteredItems.map((item) => {
                const validity = getValidityLabel(item);
                return (
                  <Link key={item.id} href={`/quotes?quoteId=${item.id}&mode=${encodeURIComponent(filters.mode)}&q=${encodeURIComponent(filters.q)}&status=${encodeURIComponent(filters.status)}&company=${encodeURIComponent(filters.company)}&from=${encodeURIComponent(filters.from)}&to=${encodeURIComponent(filters.to)}`} className={`grid gap-3 px-4 py-4 text-sm transition hover:bg-slate-50 lg:grid-cols-[36px_1.35fr_.8fr_.55fr_.8fr_.75fr_.75fr_.7fr] ${selected?.id === item.id ? 'bg-brand-50' : item.status === 'accepted' ? 'bg-emerald-50/40' : 'bg-white'} ${item.status === 'pending_approval' ? 'border-l-4 border-amber-400' : validity.tone.includes('rose') ? 'border-l-4 border-rose-400' : ''}`}> 
                    <span aria-hidden="true" className="mt-1 h-4 w-4 rounded border border-slate-300 bg-white"></span>
                    <span><strong className="block text-slate-900">{item.companyName}</strong><span className="text-xs text-slate-500">{item.quoteNumber ?? item.id.slice(0, 8)} · {item.lineItems[0]?.productName ?? 'No product'}{item.lineItems.length > 1 ? ` + ${item.lineItems.length - 1}` : ''}</span><span className="mt-1 block text-[11px] font-semibold text-slate-400">Quote ID {item.quoteNumber ?? item.id.slice(0, 8)}</span></span>
                    <span><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getQuoteStatusBadgeClasses(item.status as any)}`}>{labelizeStatus(item.status)}</span></span>
                    <span className="text-xs font-semibold text-slate-700">v{item.totalVersions || 1}</span>
                    <span className="text-right font-semibold text-slate-900">{formatQuoteMoney(item.subtotal, item.currency)}<span className="block text-[11px] font-semibold text-slate-500">{item.currency ?? 'USD'} · Quote</span></span>
                    <span className={`text-xs font-semibold ${validity.tone}`}>{validity.label}</span>
                    <span className="text-xs text-slate-600">{item.contactName ?? 'Owner not set'}</span>
                    <span className="text-right"><span className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">{getQuoteActionLabel(item)}</span></span>
                  </Link>
                );
              }) : <div className="px-4 py-8 text-sm text-slate-500">No quotes match these filters.</div>}
            </div>
          </div>
        </SectionCard>

        <aside className="space-y-4">
          <SectionCard eyebrow="Quote detail" title={selected ? selected.companyName : 'No quote selected'} description="Line pricing, FX lock, override signals, and next actions stay visible here.">
            {selected ? (
              <div className="space-y-4 text-sm text-slate-600">
                {selected.status === 'pending_approval' || selected.hasPriceOverride ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                    <p className="font-semibold">Approval required — pricing override</p>
                    <p className="mt-2 text-xs leading-5">One or more lines are manually priced. Approve or reject the override before this quote can be sent.</p>
                    <div className="mt-3 flex gap-2">
                      <Link href={withQuoteParam(selectedApprovalHref, selected.id, selected.leadId)} className="flex-1 rounded-2xl bg-amber-700 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-amber-800">Approve & allow send</Link>
                      <Link href={withQuoteParam(selectedApprovalHref, selected.id, selected.leadId)} className="rounded-2xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100">Reject override</Link>
                    </div>
                  </div>
                ) : null}

                <div className={`rounded-2xl border p-4 ${nextStepToneClasses(selected.nextStep.tone)}`}>
                  <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getQuoteStatusBadgeClasses(selected.status as any)}`}>{labelizeStatus(selected.status)}</span><span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">{selected.quoteNumber ?? selected.id.slice(0, 8)}</span></div>
                  <p className="mt-3 text-lg font-semibold text-slate-950">{selected.nextStep.label}</p>
                  <p className="mt-2 leading-6">{selected.nextStep.detail}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Quote details</p>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Company</dt><dd className="font-semibold text-slate-900">{selected.companyName}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Contact</dt><dd className="font-semibold text-slate-900">{selected.contactName ?? 'Not set'}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Currency</dt><dd className="font-semibold text-slate-900">{selected.currency ?? 'USD'}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Validity</dt><dd className={`font-semibold ${getValidityLabel(selected).tone}`}>{getValidityLabel(selected).label}</dd></div>
                  </dl>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Subtotal</p><p className="mt-2 text-xl font-semibold text-slate-950">{formatQuoteMoney(selected.subtotal, selected.currency)}</p></div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Quote total</p><p className="mt-2 text-xl font-semibold text-slate-950">{formatQuoteMoney(selected.subtotal, selected.currency)}</p></div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Line items</p>
                  <div className="mt-3 overflow-hidden rounded-2xl border border-slate-100">
                    <div className="grid grid-cols-[1.2fr_.7fr_.7fr_.7fr] gap-2 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"><span>Product</span><span className="text-right">Catalog</span><span className="text-right">Quoted</span><span className="text-right">Total</span></div>
                    {selected.lineItems.length ? selected.lineItems.map((line) => (
                      <div key={line.id} className="grid grid-cols-[1.2fr_.7fr_.7fr_.7fr] gap-2 border-t border-slate-100 px-3 py-3 text-xs">
                        <div><p className="font-semibold text-slate-900">{line.productName}</p><p className="mt-1 text-slate-500">QTY {line.quantity}</p>{line.isPriceOverridden ? <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-800">Price overridden</span> : null}</div>
                        <div className="text-right text-slate-500">{line.catalogPriceAmount != null ? formatQuoteMoney(line.catalogPriceAmount, line.catalogPriceCurrency) : 'Missing'}</div>
                        <div className={`text-right font-semibold ${line.isPriceOverridden ? 'text-amber-700' : 'text-slate-900'}`}>{formatQuoteMoney(line.unitPrice, line.currency)}</div>
                        <div className="text-right font-semibold text-slate-900">{formatQuoteMoney(line.quantity * (line.unitPrice ?? 0), line.currency)}</div>
                        {line.isPriceOverridden && line.overrideReason ? <p className="col-span-4 text-xs text-amber-800">Reason: {line.overrideReason}</p> : null}
                      </div>
                    )) : <p className="border-t border-slate-100 px-3 py-4 text-sm text-slate-500">No line items are attached to this quote yet.</p>}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">FX and override context</p>
                  {selected.fxLock ? (
                    <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sky-900">
                      <p className="font-semibold">Converted from {selected.fxLock.sourceCurrency}</p>
                      <p className="mt-1">Rate: {selected.fxLock.fxRate} {selected.fxLock.quoteCurrency} per {selected.fxLock.sourceCurrency}</p>
                      <p className="mt-1">FX lock valid until {formatDateTime(selected.fxLock.fxValidUntil)}</p>
                    </div>
                  ) : <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-slate-600">No FX conversion is needed for this quote, or the quote is still missing a locked FX snapshot.</p>}
                  {selected.hasPriceOverride ? <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 font-semibold text-amber-900">Price overridden — override reason remains required before governed send.</p> : <p className="mt-3 rounded-2xl bg-emerald-50 p-3 font-semibold text-emerald-800">No manual price override on current lines.</p>}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Link href={selected.status === 'approved' ? selectedSendHref : selected.nextStep.href} className="inline-flex justify-center rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">{selected.status === 'approved' ? 'Send Quote' : selected.nextStep.label}</Link>
                  <Link href={selectedApprovalHref} className="inline-flex justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Approval Status</Link>
                  <Link href={buildLeadQuoteHref(selected.leadId, selected.id, selectedMode, { handoff: 'quote-revise' })} className="inline-flex justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Revise</Link>
                  <Link href={selectedLeadHref} className="inline-flex justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Duplicate</Link>
                  <Link href={selectedOrderHref} className="inline-flex justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Create order</Link>
                  <Link href="/quotes?export=pdf" className="inline-flex justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Export PDF</Link>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                  <span>Approved: {selected.latestApprovedAt ? formatDateTime(selected.latestApprovedAt) : 'not yet'}</span>
                  <span>Sent: {selected.latestSentAt ? formatDateTime(selected.latestSentAt) : 'not yet'}</span>
                </div>
              </div>
            ) : <p className="text-sm text-slate-500">Choose a quote from the list to review detail.</p>}
          </SectionCard>

          <SectionCard eyebrow="Quote history" title="Status and version timeline" description="Previous versions stay visible while revisions move forward deliberately.">
            <QuoteHistoryList items={selectedHistory} />
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
