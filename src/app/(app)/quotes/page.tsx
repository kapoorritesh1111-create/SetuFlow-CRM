import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { buildQuotesPageViewModel } from '@/features/quotes/logic/build-quotes-page-view-model';
import { QuoteHistoryList } from '@/features/quotes/ui/quote-history-list';
import { formatQuoteMoney } from '@/features/quotes/logic/formatting';
import { buildApprovalSendHref, buildLeadQuoteHref, buildOrdersHref } from '@/lib/workflow/handoffs';
import { SetuStatsStrip, SetuTopbarActions, SetuWorkspaceShell } from '@/components/setu-shell';

const FILTER_STATUSES = ['all', 'draft', 'internal_review', 'pending_approval', 'approved', 'sent', 'revised', 'accepted', 'rejected', 'expired'] as const;
const FILTER_MODES = ['all', 'buyers', 'suppliers'] as const;

type QuoteWorkspaceItem = ReturnType<typeof buildQuotesPageViewModel>['items'][number];
type SearchParams = {
  quoteId?: string | string[];
  q?: string | string[];
  status?: string | string[];
  owner?: string | string[];
  market?: string | string[];
  approval?: string | string[];
  from?: string | string[];
  to?: string | string[];
  mode?: string | string[];
};

function readSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function labelizeStatus(value: string) {
  return value.replaceAll('_', ' ');
}

function titleCase(value: string) {
  return labelizeStatus(value).replace(/\b\w/g, (match) => match.toUpperCase());
}

function readIsoDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Date.parse(`${trimmed}T00:00:00.000Z`);
  return Number.isFinite(parsed) ? parsed : null;
}

function getQuoteActionLabel(item: QuoteWorkspaceItem) {
  if (item.status === 'pending_approval') return 'Review';
  if (item.status === 'approved') return 'Send';
  if (item.status === 'accepted' || item.hasAcceptedContract) return 'Create order';
  if (['draft', 'revised', 'internal_review'].includes(item.status)) return 'Continue';
  if (item.status === 'sent') return 'Follow up';
  return 'Open';
}

function getValidityLabel(item: QuoteWorkspaceItem) {
  if (item.status === 'accepted' || item.hasAcceptedContract) return { label: 'Order ready', rose: false, amber: false, emerald: true };
  if (item.status === 'draft') return { label: 'Not sent', rose: false, amber: false, emerald: false };
  if (item.status === 'expired') return { label: 'Expired', rose: true, amber: false, emerald: false };
  const updatedAt = Date.parse(item.updatedAt);
  if (!Number.isFinite(updatedAt)) return { label: 'Validity unknown', rose: false, amber: false, emerald: false };
  const daysSinceUpdate = Math.floor((Date.now() - updatedAt) / (24 * 60 * 60 * 1000));
  const daysLeft = Math.max(0, 30 - daysSinceUpdate);
  if (daysLeft <= 3) return { label: `${daysLeft} days left`, rose: true, amber: false, emerald: false };
  if (daysLeft <= 7) return { label: `${daysLeft} days left`, rose: false, amber: true, emerald: false };
  return { label: `${daysLeft} days left`, rose: false, amber: false, emerald: false };
}

function filterItems(items: ReturnType<typeof buildQuotesPageViewModel>['items'], f: { q: string; status: string; from: string; to: string; mode: string; approval: string }) {
  const q = f.q.trim().toLowerCase();
  const from = readIsoDate(f.from);
  const to = readIsoDate(f.to);
  const toEnd = to == null ? null : to + 24 * 60 * 60 * 1000 - 1;
  const status = f.status === 'all' ? '' : f.status;
  const mode = f.mode === 'buyers' ? 'buyer' : f.mode === 'suppliers' ? 'supplier' : '';
  return items.filter((item) => {
    const productNames = item.lineItems.map((line) => line.productName).join(' ');
    const haystack = `${item.quoteNumber ?? ''} ${item.id} ${item.companyName} ${item.contactName ?? ''} ${productNames}`.toLowerCase();
    if (q && !haystack.includes(q)) return false;
    if (status && item.status !== status) return false;
    if (mode && item.leadType !== mode) return false;
    if (f.approval === 'pending' && item.status !== 'pending_approval') return false;
    if (f.approval === 'blocked' && !item.hasPriceOverride) return false;
    const updatedAt = Date.parse(item.updatedAt);
    if (from != null && Number.isFinite(updatedAt) && updatedAt < from) return false;
    if (toEnd != null && Number.isFinite(updatedAt) && updatedAt > toEnd) return false;
    return true;
  });
}

function buildQuery(params: Record<string, string | null | undefined>) {
  const next = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) next.set(key, value);
  });
  const query = next.toString();
  return query ? `/quotes?${query}` : '/quotes';
}

function statusStyle(status: string) {
  const colors: Record<string, { bg: string; border: string; color: string }> = {
    draft: { bg: '#f1f5f9', border: '#e2e8f0', color: '#475569' },
    internal_review: { bg: '#f1f5f9', border: '#e2e8f0', color: '#475569' },
    pending_approval: { bg: '#fffbeb', border: '#fde68a', color: '#92400e' },
    approved: { bg: '#ecfdf5', border: '#a7f3d0', color: '#059669' },
    sent: { bg: '#fffbeb', border: '#fde68a', color: '#92400e' },
    revised: { bg: '#f0f9ff', border: '#bae6fd', color: '#0284c7' },
    accepted: { bg: '#ede9fe', border: '#c4b5fd', color: '#5b21b6' },
    rejected: { bg: '#fff1f2', border: '#fecaca', color: '#dc2626' },
    expired: { bg: '#f1f5f9', border: '#e2e8f0', color: '#64748b' },
  };
  return colors[status] ?? colors.draft;
}

function getSelectedMode(selected: QuoteWorkspaceItem | null) {
  if (selected?.leadType === 'buyer') return 'buyers';
  if (selected?.leadType === 'supplier') return 'suppliers';
  return null;
}

export default async function QuotesPage({ searchParams }: { searchParams?: SearchParams }) {
  let workspace: Awaited<ReturnType<typeof getWorkspaceAccess>> | null = null;
  try {
    workspace = await getWorkspaceAccess();
  } catch {
    return <EmptyState title="Workspace unavailable" description="Could not load workspace." />;
  }
  if (!hasSupabaseEnv || workspace?.missingEnv) return <EmptyState title="Configuration required" description="SETU Flow needs Supabase environment values." />;
  if (!workspace?.organization) return <EmptyState title="Workspace membership needed" description="No active organization membership." />;

  const supabase = await createClient();
  const db = supabase as any;
  const organizationId = workspace.organization.id;
  const selectedQuoteId = readSearchParam(searchParams?.quoteId).trim() || null;
  const requestedMode = readSearchParam(searchParams?.mode);
  const requestedStatus = readSearchParam(searchParams?.status);
  const filters = {
    q: readSearchParam(searchParams?.q),
    status: FILTER_STATUSES.includes(requestedStatus as (typeof FILTER_STATUSES)[number]) ? requestedStatus : 'all',
    owner: readSearchParam(searchParams?.owner) || 'all',
    market: readSearchParam(searchParams?.market) || 'all',
    approval: readSearchParam(searchParams?.approval) || 'all',
    from: readSearchParam(searchParams?.from),
    to: readSearchParam(searchParams?.to),
    mode: FILTER_MODES.includes(requestedMode as (typeof FILTER_MODES)[number]) ? requestedMode : 'all',
  };

  const quotesResult = await db
    .from('quotes')
    .select('id, lead_id, status, currency, notes, quote_number, created_at, updated_at, current_version_id')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .limit(200);

  const stats = [
    { label: 'Pending approval', value: '-', meta: 'Waiting for review', accent: '#d97706' },
    { label: 'Expiring soon', value: '-', meta: 'Within 3 days', accent: '#dc2626' },
    { label: 'Sent & active', value: '-', meta: 'Awaiting buyer response', accent: '#0c7fff' },
    { label: 'Accepted', value: '-', meta: 'Order creation available', accent: '#059669' },
    { label: 'Drafts', value: '-', meta: 'Not yet sent', accent: '#cbd5e1' },
    { label: 'Total value', value: '-', meta: 'All active quotes', accent: '#7c3aed' },
  ];

  if (quotesResult.error) {
    return (
      <SetuWorkspaceShell>
        <SetuTopbarActions title="Quotes Workspace" actions={[{ label: '+ New quote', href: PRODUCT_ROUTES.app.leads, variant: 'primary' }]} />
        <SetuStatsStrip stats={stats} />
        <div style={{ padding: '14px 0 40px' }}>
          <div style={{ background: 'white', border: '1px solid #fde68a', borderRadius: '22px', padding: '28px', boxShadow: '0 1px 3px rgba(15,23,42,.06)' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: '#d97706', marginBottom: '8px' }}>Recoverable data issue</div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Quotes workspace is still available</h2>
            <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '680px' }}>The quotes query returned: {String(quotesResult.error.message ?? 'Unknown error')}.</p>
            <Link href={PRODUCT_ROUTES.app.leads} style={{ display: 'inline-flex', marginTop: '12px', padding: '9px 18px', background: '#0b2e4a', color: 'white', borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>+ New quote</Link>
          </div>
        </div>
      </SetuWorkspaceShell>
    );
  }

  const quotes = Array.isArray(quotesResult.data) ? quotesResult.data : [];
  const quoteIds = quotes.map((quote: any) => quote.id).filter(Boolean);
  const leadIds = [...new Set(quotes.map((quote: any) => quote.lead_id).filter(Boolean))];

  const [leadsResult, versionsResult, negotiationsResult, communicationsResult, contractsResult, lineItemsResult] = await Promise.all([
    leadIds.length ? db.from('leads').select('id, company_name, contact_name, lead_type').eq('organization_id', organizationId).in('id', leadIds) : Promise.resolve({ data: [], error: null }),
    quoteIds.length ? db.from('quote_versions').select('id, quote_id, version_no, status, created_at, approved_at, sent_at').in('quote_id', quoteIds).order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
    quoteIds.length ? db.from('quote_negotiation_events').select('id, quote_id, event_type, message, created_at, actor_name').in('quote_id', quoteIds).order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
    quoteIds.length ? db.from('communications').select('id, quote_id, subject, summary, status, created_at').in('quote_id', quoteIds).order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
    quoteIds.length ? db.from('contracts').select('id, quote_id, status, signed_at, starts_on, commercial_lock_state, commercial_snapshot').eq('organization_id', organizationId).in('quote_id', quoteIds) : Promise.resolve({ data: [], error: null }),
    quoteIds.length ? db.from('quote_line_items').select('id, quote_id, product_id, quantity, unit_price, currency, catalog_price_amount, catalog_price_currency, is_price_overridden, override_reason, notes').in('quote_id', quoteIds) : Promise.resolve({ data: [], error: null }),
  ]);

  const lineItems = Array.isArray(lineItemsResult.data) ? lineItemsResult.data : [];
  const productIds = [...new Set(lineItems.map((line: any) => line.product_id).filter(Boolean))];
  const productsResult = productIds.length ? await db.from('products').select('id, name, sku').eq('organization_id', organizationId).in('id', productIds) : { data: [], error: null };

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
  const selected = selectedQuoteId ? viewModel.items.find((item) => item.id === selectedQuoteId) ?? null : null;
  const selectedMode = getSelectedMode(selected);
  const selectedApprovalHref = selected ? buildApprovalSendHref({ queue: selected.status === 'approved' ? 'send' : 'approvals', quoteId: selected.id, leadId: selected.leadId, handoff: selected.status === 'approved' ? 'quote-ready-to-send' : 'quote-approval-status' }, selectedMode) : PRODUCT_ROUTES.app.integrations;
  const selectedOrderHref = selected ? buildOrdersHref({ notice: 'quote-accepted', quoteId: selected.id, leadId: selected.leadId, handoff: 'quote-to-orders' }, selectedMode) : PRODUCT_ROUTES.app.orders;
  const selectedHistory = selected ? buildQuotesPageViewModel({ ...baseViewModelInput, selectedQuoteId: selected.id }).selectedHistory : [];

  const approvalQueue = viewModel.items.filter((item) => item.status === 'pending_approval');
  const approvalQueueCount = approvalQueue.length;
  const expiringSoonCount = viewModel.items.filter((item) => {
    const validity = getValidityLabel(item);
    return validity.rose && item.status !== 'expired';
  }).length;
  const sentActiveCount = viewModel.items.filter((item) => ['sent', 'approved', 'negotiating'].includes(item.status)).length;
  const draftCount = viewModel.items.filter((item) => ['draft', 'internal_review', 'revised'].includes(item.status)).length;
  const acceptedCount = viewModel.items.filter((item) => item.status === 'accepted' || item.hasAcceptedContract).length;
  const totalValue = viewModel.items.reduce((sum, item) => sum + item.subtotal, 0);
  const firstApproval = approvalQueue[0];
  const secondApproval = approvalQueue[1];

  const summaryStats = [
    { label: 'Pending approval', value: approvalQueueCount, meta: 'Waiting for review', accent: '#d97706' },
    { label: 'Expiring soon', value: expiringSoonCount, meta: 'Within 3 days', accent: '#dc2626' },
    { label: 'Sent & active', value: sentActiveCount, meta: 'Awaiting buyer response', accent: '#0c7fff' },
    { label: 'Accepted', value: acceptedCount, meta: 'Order creation available', accent: '#059669' },
    { label: 'Drafts', value: draftCount, meta: 'Not yet sent', accent: '#cbd5e1' },
    { label: 'Total value', value: formatQuoteMoney(totalValue, 'USD'), meta: 'All active quotes', accent: '#7c3aed' },
  ];

  return (
    <SetuWorkspaceShell>
      <SetuTopbarActions title="Quotes Workspace" actions={[{ label: '+ New quote', href: PRODUCT_ROUTES.app.leads, variant: 'primary' }]} />

      <form action="/quotes" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', boxShadow: '0 1px 3px rgba(15,23,42,.04)' }}>
        <input type="hidden" name="mode" value={filters.mode} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', height: '32px', minWidth: '220px' }}>
          <input name="q" defaultValue={filters.q} placeholder="Search company, quote ref, product..." style={{ border: 'none', outline: 'none', fontSize: '11px', color: '#1e293b', background: 'transparent', width: '100%' }} />
        </div>
        <select name="status" defaultValue={filters.status} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc', padding: '0 10px', height: '32px', fontSize: '11px', fontWeight: 600, color: '#1e293b', minWidth: '130px' }}>
          {FILTER_STATUSES.map((status) => <option key={status} value={status}>{status === 'all' ? 'All statuses' : titleCase(status)}</option>)}
        </select>
        <select name="approval" defaultValue={filters.approval} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc', padding: '0 10px', height: '32px', fontSize: '11px', fontWeight: 600, color: '#1e293b', minWidth: '120px' }}>
          <option value="all">All approvals</option>
          <option value="pending">Pending</option>
          <option value="blocked">Blocked</option>
        </select>
        <select name="owner" defaultValue={filters.owner} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc', padding: '0 10px', height: '32px', fontSize: '11px', fontWeight: 600, color: '#1e293b', minWidth: '110px' }}>
          <option value="all">All owners</option>
        </select>
        <select name="market" defaultValue={filters.market} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc', padding: '0 10px', height: '32px', fontSize: '11px', fontWeight: 600, color: '#1e293b', minWidth: '110px' }}>
          <option value="all">All markets</option>
        </select>
        {approvalQueueCount > 0 ? <Link href={buildQuery({ mode: filters.mode, approval: 'pending', status: 'pending_approval' })} style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', textDecoration: 'none' }}>Pending approval ({approvalQueueCount})</Link> : null}
        {expiringSoonCount > 0 ? <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, background: '#fff1f2', border: '1px solid #fecaca', color: '#9f1239' }}>Expiring ({expiringSoonCount})</span> : null}
        <button type="submit" style={{ padding: '0 12px', height: '32px', borderRadius: '6px', background: '#0b2e4a', color: 'white', fontSize: '11px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Apply</button>
        <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 600, color: '#94a3b8' }}>{filteredItems.length} quotes · {formatQuoteMoney(totalValue, 'USD')} total value</span>
      </form>

      <SetuStatsStrip stats={summaryStats} />

      <div style={{ padding: '14px 0 40px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {approvalQueueCount > 0 ? (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '12px 16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#92400e', marginBottom: '4px' }}>{approvalQueueCount} quote{approvalQueueCount > 1 ? 's' : ''} pending approval — pricing override review required</div>
            <div style={{ fontSize: '11px', color: '#92400e', lineHeight: '1.55' }}>Review overrides, approve or reject, and keep the send gate blocked until approval is logged.</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              {firstApproval ? <Link href={buildQuery({ quoteId: firstApproval.id, mode: filters.mode })} style={{ padding: '7px 16px', borderRadius: '6px', background: '#059669', color: 'white', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>Review {firstApproval.quoteNumber ?? firstApproval.id.slice(0, 8)} ({firstApproval.companyName})</Link> : null}
              {secondApproval ? <Link href={buildQuery({ quoteId: secondApproval.id, mode: filters.mode })} style={{ padding: '7px 14px', borderRadius: '6px', background: 'white', border: '1px solid #e2e8f0', color: '#334155', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>Review {secondApproval.quoteNumber ?? secondApproval.id.slice(0, 8)} ({secondApproval.companyName})</Link> : null}
            </div>
          </div>
        ) : null}

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '22px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,.06)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div><div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#0c7fff', marginBottom: '2px' }}>Quote workspace</div><div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Governed quote table</div></div>
            <Link href={PRODUCT_ROUTES.app.leads} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', fontSize: '11px', fontWeight: 700, color: '#475569', textDecoration: 'none' }}>Open builder</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 120px 100px 110px 110px 90px 90px', gap: '8px', padding: '9px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '9px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#94a3b8' }}>
            <div /><div>Company / ref</div><div>Status</div><div>Version</div><div style={{ textAlign: 'right' }}>Total value</div><div>Validity</div><div>Owner</div><div style={{ textAlign: 'right' }}>Action</div>
          </div>
          {filteredItems.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>No quotes match these filters.</div>
          ) : filteredItems.map((item) => {
            const validity = getValidityLabel(item);
            const isPending = item.status === 'pending_approval';
            const isExpiring = validity.rose && item.status !== 'expired';
            const isAccepted = item.status === 'accepted' || item.hasAcceptedContract;
            const isSelected = selected?.id === item.id;
            const borderLeft = isPending ? '3px solid #d97706' : isExpiring ? '3px solid #dc2626' : '3px solid transparent';
            const actionLabel = getQuoteActionLabel(item);
            const actionPrimary = isPending || isAccepted || item.status === 'approved';
            const style = statusStyle(item.status);
            return (
              <Link key={item.id} href={buildQuery({ quoteId: item.id, mode: filters.mode, q: filters.q, status: filters.status, approval: filters.approval })} style={{ display: 'grid', gridTemplateColumns: '30px 1fr 120px 100px 110px 110px 90px 90px', gap: '8px', padding: '12px 18px', borderBottom: '1px solid #e2e8f0', alignItems: 'center', textDecoration: 'none', background: isSelected ? 'rgba(12,127,255,.04)' : isAccepted ? 'rgba(5,150,105,.02)' : 'white', borderLeft }}>
                <div><span style={{ display: 'inline-flex', width: '16px', height: '16px', borderRadius: '3px', border: '1px solid #cbd5e1', background: isSelected ? '#0c7fff' : 'white' }} /></div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.companyName}</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace', marginTop: '1px' }}>{item.quoteNumber ?? item.id.slice(0, 8)} · {item.lineItems[0]?.productName ?? 'No product'}{item.lineItems.length > 1 ? ` + ${item.lineItems.length - 1}` : ''}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {Array.from({ length: Math.min(item.totalVersions || 1, 3) }, (_, index) => (item.totalVersions || 1) - index).map((version, index) => (
                      <span key={`${item.id}-${version}`} style={{ fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: index === 0 ? (isAccepted ? '#ecfdf5' : '#0c7fff') : '#f1f5f9', border: `1px solid ${index === 0 ? (isAccepted ? '#a7f3d0' : '#0c7fff') : '#e2e8f0'}`, color: index === 0 ? (isAccepted ? '#059669' : 'white') : '#475569' }}>v{version}{index === 0 ? ' current' : ''}</span>
                    ))}
                  </div>
                </div>
                <div><span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '999px', fontSize: '9px', fontWeight: 700, border: '1px solid', background: style.bg, borderColor: style.border, color: style.color, whiteSpace: 'nowrap' }}>{titleCase(item.status)}</span></div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#334155' }}>v{item.totalVersions || 1}</div>
                <div style={{ textAlign: 'right' }}><div style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b' }}>{formatQuoteMoney(item.subtotal, item.currency)}</div><div style={{ fontSize: '10px', color: '#94a3b8' }}>{item.currency ?? 'USD'} · Quote</div></div>
                <div style={{ fontSize: '11px', fontWeight: validity.rose || validity.amber ? 700 : 400, color: validity.rose ? '#dc2626' : validity.amber ? '#d97706' : validity.emerald ? '#059669' : '#64748b' }}>{validity.label}</div>
                <div style={{ fontSize: '11px', color: '#475569' }}>{item.contactName ?? '—'}</div>
                <div style={{ textAlign: 'right' }}><span style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid', fontSize: '10px', fontWeight: 700, background: actionPrimary ? '#0b2e4a' : 'white', borderColor: actionPrimary ? '#0b2e4a' : '#e2e8f0', color: actionPrimary ? 'white' : '#475569' }}>{actionLabel}</span></div>
              </Link>
            );
          })}
        </div>
      </div>

      {selected ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(5,15,30,.35)', backdropFilter: 'blur(2px)' }}>
          <Link href={buildQuery({ mode: filters.mode, q: filters.q, status: filters.status, approval: filters.approval })} aria-label="Close quote details" style={{ position: 'absolute', inset: 0 }} />
          <aside style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '460px', maxWidth: '100vw', background: 'white', boxShadow: '-12px 0 40px rgba(15,23,42,.12)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginBottom: '3px' }}>{selected.companyName}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{selected.quoteNumber ?? selected.id.slice(0, 8)} · v{selected.totalVersions || 1} · {titleCase(selected.status)}</div>
              </div>
              <Link href={buildQuery({ mode: filters.mode, q: filters.q, status: filters.status, approval: filters.approval })} style={{ width: '30px', height: '30px', borderRadius: '999px', background: '#f1f5f9', color: '#334155', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, textDecoration: 'none' }}>×</Link>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1 }}>
              {(selected.status === 'pending_approval' || selected.hasPriceOverride) ? (
                <div style={{ padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#92400e', marginBottom: '4px' }}>Approval required — pricing override</div>
                  <div style={{ fontSize: '11px', color: '#92400e', marginBottom: '10px' }}>Send is gated until approval is complete. Review override details before releasing the quote.</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link href={selectedApprovalHref} style={{ padding: '7px 16px', borderRadius: '6px', background: '#059669', color: 'white', fontSize: '12px', fontWeight: 700, textDecoration: 'none', flex: 1, textAlign: 'center' }}>Approve & allow send</Link>
                    <Link href={selectedApprovalHref} style={{ padding: '7px 14px', borderRadius: '6px', background: 'white', border: '1px solid #fecaca', color: '#dc2626', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>Reject</Link>
                  </div>
                </div>
              ) : selected.status === 'approved' ? (
                <div style={{ padding: '12px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#047857', marginBottom: '4px' }}>Safe to send</div>
                  <div style={{ fontSize: '11px', color: '#047857' }}>Approval is complete. Use the send CTA to continue through the governed send flow.</div>
                </div>
              ) : null}

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px' }}>Overview</div>
                {[
                  ['Company', selected.companyName],
                  ['Contact', selected.contactName ?? 'Not set'],
                  ['Currency', selected.currency ?? 'USD'],
                  ['Subtotal', formatQuoteMoney(selected.subtotal, selected.currency)],
                  ['Workflow gate', selected.status === 'approved' ? 'Approved to send' : selected.status === 'pending_approval' ? 'Approval pending' : selected.hasAcceptedContract ? 'Order ready' : 'Builder / follow-up'],
                ].map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0', borderBottom: '1px solid rgba(0,0,0,.03)' }}><span style={{ color: '#64748b' }}>{key}</span><span style={{ fontWeight: 700, color: '#1e293b', textAlign: 'right' }}>{value}</span></div>
                ))}
              </div>

              {selected.lineItems.length > 0 ? (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px' }}>Line items</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead><tr><th style={{ textAlign: 'left', padding: '5px 8px', fontSize: '9px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>Product</th><th style={{ textAlign: 'right', padding: '5px 8px', fontSize: '9px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>Catalog</th><th style={{ textAlign: 'right', padding: '5px 8px', fontSize: '9px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>Quoted</th><th style={{ textAlign: 'right', padding: '5px 8px', fontSize: '9px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>Total</th></tr></thead>
                    <tbody>
                      {selected.lineItems.map((line) => (
                        <tr key={line.id}>
                          <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}><div style={{ fontWeight: 700, color: '#1e293b' }}>{line.productName}</div><div style={{ fontSize: '10px', color: '#94a3b8' }}>QTY {line.quantity}</div>{line.isPriceOverridden ? <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: '#fef3c7', color: '#92400e' }}>Override</span> : null}</td>
                          <td style={{ textAlign: 'right', padding: '8px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{line.catalogPriceAmount != null ? formatQuoteMoney(line.catalogPriceAmount, line.catalogPriceCurrency) : '—'}</td>
                          <td style={{ textAlign: 'right', padding: '8px', fontWeight: 700, color: line.isPriceOverridden ? '#d97706' : '#1e293b', borderBottom: '1px solid #e2e8f0' }}>{formatQuoteMoney(line.unitPrice, line.currency)}</td>
                          <td style={{ textAlign: 'right', padding: '8px', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>{formatQuoteMoney(line.quantity * (line.unitPrice ?? 0), line.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px', fontWeight: 800, borderTop: '1px solid #e2e8f0', marginTop: '6px' }}><span>Quote total</span><span style={{ color: '#0b2e4a' }}>{formatQuoteMoney(selected.subtotal, selected.currency)}</span></div>
                </div>
              ) : null}

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px' }}>Version history</div>
                {selectedHistory.length > 0 ? <QuoteHistoryList items={selectedHistory} /> : <div style={{ fontSize: '12px', color: '#64748b' }}>No version events yet.</div>}
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px' }}>
              <Link href={buildLeadQuoteHref(selected.leadId, selected.id, selectedMode, { handoff: 'quote-revise' })} style={{ padding: '9px 14px', borderRadius: '6px', background: 'white', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 600, color: '#475569', textDecoration: 'none' }}>Edit quote</Link>
              <Link href={selected.status === 'accepted' || selected.hasAcceptedContract ? selectedOrderHref : selectedApprovalHref} style={{ flex: 1, padding: '9px 16px', borderRadius: '6px', background: '#0b2e4a', color: 'white', fontSize: '12px', fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>{selected.status === 'accepted' || selected.hasAcceptedContract ? 'Create order' : selected.status === 'pending_approval' ? 'Approve & allow send' : selected.status === 'approved' ? 'Safe send flow' : 'Open lead'}</Link>
            </div>
          </aside>
        </div>
      ) : null}
    </SetuWorkspaceShell>
  );
}
