import type { CSSProperties } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { EmptyState } from '@/components/ui/empty-state';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { buildQuotesPageViewModel } from '@/features/quotes/logic/build-quotes-page-view-model';
import { formatQuoteMoney } from '@/features/quotes/logic/formatting';
import { buildLeadQuoteHref, buildOrdersHref } from '@/lib/workflow/handoffs';
import { DiscussionButton } from '@/components/chat/discussion-button';
import { approveLeadQuoteAdjustment, rejectLeadQuoteAdjustment } from '@/features/leads/server/actions';
import { logQuoteNegotiationResponse, markQuoteAsDirectOrder, recordQuoteOutcomeWorkflow } from '@/features/quotes/server/actions';

const FILTER_STATUSES = ['all','active','sent','accepted','revision_requested','pending_approval','draft','cleanup','archive','rejected','expired'];
const FILTER_MODES = ['all','buyers','suppliers'];
const GROUP_MODES = ['priority','lifecycle','value','customer','product'] as const;

type QuoteWorkspaceItem = ReturnType<typeof buildQuotesPageViewModel>['items'][number];
type QuoteLifecycleRow = {
  id: string;
  quote_id: string;
  event_type: string;
  outcome: string | null;
  message: string | null;
  created_at: string;
};
type QuoteEnhancementMeta = {
  archived_at?: string | null;
  archive_reason?: string | null;
  lifecycle_outcome?: string | null;
  follow_up_at?: string | null;
  last_customer_response_at?: string | null;
};
type EnhancedQuoteItem = QuoteWorkspaceItem & QuoteEnhancementMeta & { lifecycleEvents?: QuoteLifecycleRow[] };
type CustomerGroup = {
  key: string;
  companyName: string;
  contactName: string | null;
  leadType: string | null;
  quotes: EnhancedQuoteItem[];
  proposedValue: number;
  acceptedValue: number;
  orderValue: number;
  cleanupValue: number;
  archiveValue: number;
  quoteCount: number;
  sentCount: number;
  revisionCount: number;
  acceptedCount: number;
  cleanupCount: number;
  archiveCount: number;
  latestUpdatedAt: string;
  recommended: ReturnType<typeof getRecommendedAction>;
};

function readSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function labelizeStatus(value: string) {
  return value.replaceAll('_', ' ').replaceAll('-', ' ');
}

function readIsoDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Date.parse(`${trimmed}T00:00:00.000Z`);
  return Number.isFinite(parsed) ? parsed : null;
}

function getValidityLabel(item: EnhancedQuoteItem) {
  const status = String(item.status ?? '').toLowerCase();
  if (status === 'accepted' || item.hasAcceptedContract) return { label: 'Order handoff', tone: 'green' as const, daysLeft: null as number | null };
  if (status === 'expired') return { label: 'Archived expiry', tone: 'slate' as const, daysLeft: 0 };
  if (status === 'rejected') return { label: 'Archived loss', tone: 'slate' as const, daysLeft: null as number | null };
  if (status === 'draft') return { label: 'Not sent', tone: 'slate' as const, daysLeft: null as number | null };
  const updatedAt = Date.parse(item.updatedAt);
  if (!Number.isFinite(updatedAt)) return { label: 'Validity unknown', tone: 'slate' as const, daysLeft: null as number | null };
  const daysSinceUpdate = Math.floor((Date.now() - updatedAt) / 86_400_000);
  const daysLeft = Math.max(0, 7 - daysSinceUpdate);
  if (daysLeft <= 1) return { label: `${daysLeft} days left`, tone: 'rose' as const, daysLeft };
  if (daysLeft <= 4) return { label: `${daysLeft} days left`, tone: 'amber' as const, daysLeft };
  return { label: `${daysLeft} days left`, tone: 'slate' as const, daysLeft };
}

function getQuoteLifecycle(item: EnhancedQuoteItem) {
  const status = String(item.status ?? '').toLowerCase();
  const lifecycle = String(item.lifecycle_outcome ?? '').toLowerCase();
  const lineCount = item.lineItems?.length ?? 0;
  const subtotal = Number(item.subtotal ?? 0);

  // Zero-line / zero-value accepted records are cleanup candidates, not customer-level risk.
  // They should not dominate the customer story once a valid sent/accepted quote exists.
  if (lifecycle === 'cleanup_void_candidate') return 'cleanup';
  if ((status === 'accepted' || lifecycle === 'accepted_handoff' || lifecycle === 'data_risk_review') && (lineCount === 0 || subtotal <= 0)) return 'cleanup';
  if (lifecycle === 'revision_requested') return 'revision_requested';
  if (status === 'expired' || lifecycle === 'expired_archived') return 'expired';
  if (status === 'rejected' || lifecycle === 'rejected_archived') return 'rejected';
  if (status === 'accepted' || item.hasAcceptedContract || lifecycle === 'accepted_handoff') return 'accepted';
  if (status === 'sent' || status === 'approved' || lifecycle === 'sent_follow_up') return 'sent';
  if (status === 'pending_approval') return 'pending_approval';
  return 'draft';
}

function getQuoteActionLabel(item: EnhancedQuoteItem) {
  switch (getQuoteLifecycle(item)) {
    case 'cleanup': return 'Archive / void cleanup';
    case 'revision_requested': return 'Create revised quote';
    case 'accepted': return item.hasAcceptedContract ? 'Open order' : 'Move to Orders';
    case 'sent': return 'Log outcome';
    case 'expired': return 'Clone new version';
    case 'rejected': return 'Review archive';
    case 'pending_approval': return 'Review approval';
    default: return 'Continue quote';
  }
}

function getStatusStyle(status: string, lifecycle?: string) {
  const resolved = lifecycle === 'cleanup' ? 'cleanup' : lifecycle === 'revision_requested' ? 'revision_requested' : status;
  const statusColors: Record<string,{bg:string;border:string;color:string}> = {
    draft:{bg:'#f1f5f9',border:'#e2e8f0',color:'#475569'},
    internal_review:{bg:'#f1f5f9',border:'#e2e8f0',color:'#475569'},
    pending_approval:{bg:'#fffbeb',border:'#fde68a',color:'#92400e'},
    approved:{bg:'#ecfdf5',border:'#a7f3d0',color:'#059669'},
    sent:{bg:'#fffbeb',border:'#fde68a',color:'#92400e'},
    revised:{bg:'#f0f9ff',border:'#bae6fd',color:'#0284c7'},
    revision_requested:{bg:'#fff7ed',border:'#fed7aa',color:'#9a3412'},
    accepted:{bg:'#ede9fe',border:'#c4b5fd',color:'#5b21b6'},
    rejected:{bg:'#fff1f2',border:'#fecaca',color:'#dc2626'},
    expired:{bg:'#f8fafc',border:'#cbd5e1',color:'#334155'},
    cleanup:{bg:'#f8fafc',border:'#cbd5e1',color:'#334155'},
  };
  return statusColors[resolved] ?? statusColors.draft;
}

function isArchiveLifecycle(lifecycle: string) {
  return ['expired','rejected'].includes(lifecycle);
}

function getQuoteValueBucket(item: EnhancedQuoteItem) {
  const lifecycle = getQuoteLifecycle(item);
  if (lifecycle === 'cleanup') return 'cleanup';
  if (isArchiveLifecycle(lifecycle)) return 'archive';
  if (lifecycle === 'accepted' && item.hasAcceptedContract) return 'order';
  if (lifecycle === 'accepted') return 'accepted';
  return 'proposed';
}

function getValueBreakdown(quotes: EnhancedQuoteItem[]) {
  return quotes.reduce((acc, quote) => {
    const amount = Number(quote.subtotal ?? 0);
    const bucket = getQuoteValueBucket(quote);
    if (bucket === 'proposed') acc.proposedValue += amount;
    if (bucket === 'accepted') acc.acceptedValue += amount;
    if (bucket === 'order') acc.orderValue += amount;
    if (bucket === 'cleanup') acc.cleanupValue += amount;
    if (bucket === 'archive') acc.archiveValue += amount;
    return acc;
  }, { proposedValue: 0, acceptedValue: 0, orderValue: 0, cleanupValue: 0, archiveValue: 0 });
}

function getCustomerExposure(group: Pick<CustomerGroup, 'proposedValue' | 'acceptedValue' | 'orderValue'>) {
  return Math.max(group.proposedValue, group.acceptedValue, group.orderValue);
}


function getRecommendedAction(quotes: EnhancedQuoteItem[]) {
  const revision = quotes.find((quote) => getQuoteLifecycle(quote) === 'revision_requested');
  if (revision) return { tone: 'amber' as const, title: 'Create governed revision', body: 'Buyer requested a better quote. Keep the sent record locked and create a new version.', quote: revision };
  const accepted = quotes.find((quote) => getQuoteLifecycle(quote) === 'accepted');
  if (accepted) return { tone: 'green' as const, title: 'Move to Orders', body: 'Accepted quote is live revenue intent. Continue execution in Orders.', quote: accepted };
  const sent = quotes.find((quote) => getQuoteLifecycle(quote) === 'sent');
  if (sent) return { tone: getValidityLabel(sent).tone === 'rose' ? 'rose' as const : 'blue' as const, title: 'Follow up and log outcome', body: 'Record accepted, rejected, revision requested, no response, or expiry.', quote: sent };
  const cleanup = quotes.find((quote) => getQuoteLifecycle(quote) === 'cleanup');
  if (cleanup) return { tone: 'slate' as const, title: 'Cleanup zero-value record', body: 'Zero-line quote is not active value. Archive, void, or clone only if needed.', quote: cleanup };
  const pending = quotes.find((quote) => getQuoteLifecycle(quote) === 'pending_approval');
  if (pending) return { tone: 'amber' as const, title: 'Review approval blocker', body: 'Quote cannot be sent until approval is complete.', quote: pending };
  const draft = quotes.find((quote) => getQuoteLifecycle(quote) === 'draft');
  if (draft) return { tone: 'slate' as const, title: 'Continue quote', body: 'Finish quote lines and readiness before sending.', quote: draft };
  return { tone: 'slate' as const, title: 'Review archive', body: 'No active quote decision remains. Use archive or clone a new version.', quote: quotes[0] };
}

function filterItems(items: EnhancedQuoteItem[], f: {q:string;status:string;company:string;from:string;to:string;mode:string}) {
  const q = f.q.trim().toLowerCase();
  const company = f.company.trim().toLowerCase();
  const from = readIsoDate(f.from);
  const to = readIsoDate(f.to);
  const toEnd = to == null ? null : to + 86_400_000 - 1;
  const mode = f.mode === 'buyers' ? 'buyer' : f.mode === 'suppliers' ? 'supplier' : '';
  return items.filter(item => {
    const lifecycle = getQuoteLifecycle(item);
    const productNames = item.lineItems.map(l => l.productName).join(' ');
    const haystack = `${item.quoteNumber??''} ${item.id} ${item.companyName} ${item.contactName ?? ''} ${productNames} ${item.status} ${item.lifecycle_outcome ?? ''}`.toLowerCase();
    if (q && !haystack.includes(q)) return false;
    if (company && !item.companyName.toLowerCase().includes(company)) return false;
    if (mode && item.leadType !== mode) return false;
    if (f.status === 'active' && isArchiveLifecycle(lifecycle)) return false;
    if (f.status === 'archive' && !isArchiveLifecycle(lifecycle)) return false;
    if (!['all','active','archive'].includes(f.status) && lifecycle !== f.status && item.status !== f.status) return false;
    const updatedAt = Date.parse(item.updatedAt);
    if (from != null && Number.isFinite(updatedAt) && updatedAt < from) return false;
    if (toEnd != null && Number.isFinite(updatedAt) && updatedAt > toEnd) return false;
    return true;
  });
}

function groupQuotesByCustomer(items: EnhancedQuoteItem[]): CustomerGroup[] {
  const groups = new Map<string, EnhancedQuoteItem[]>();
  for (const item of items) {
    const key = item.leadId ?? item.companyName;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()].map(([key, quotes]) => {
    const sorted = [...quotes].sort((a, b) => {
      const pa = priorityForLifecycle(getQuoteLifecycle(a));
      const pb = priorityForLifecycle(getQuoteLifecycle(b));
      if (pa !== pb) return pa - pb;
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    });
    const recommended = getRecommendedAction(sorted);
    const values = getValueBreakdown(sorted);
    return {
      key,
      companyName: sorted[0]?.companyName ?? 'Unknown customer',
      contactName: sorted[0]?.contactName ?? null,
      leadType: sorted[0]?.leadType ?? null,
      quotes: sorted,
      proposedValue: values.proposedValue,
      acceptedValue: values.acceptedValue,
      orderValue: values.orderValue,
      cleanupValue: values.cleanupValue,
      archiveValue: values.archiveValue,
      quoteCount: sorted.length,
      sentCount: sorted.filter((quote) => getQuoteLifecycle(quote) === 'sent').length,
      revisionCount: sorted.filter((quote) => getQuoteLifecycle(quote) === 'revision_requested').length,
      acceptedCount: sorted.filter((quote) => getQuoteLifecycle(quote) === 'accepted').length,
      cleanupCount: sorted.filter((quote) => getQuoteLifecycle(quote) === 'cleanup').length,
      archiveCount: sorted.filter((quote) => isArchiveLifecycle(getQuoteLifecycle(quote))).length,
      latestUpdatedAt: sorted.map((quote) => quote.updatedAt).sort().reverse()[0] ?? '',
      recommended,
    };
  }).sort((a, b) => {
    const pa = priorityForLifecycle(getQuoteLifecycle(a.recommended.quote));
    const pb = priorityForLifecycle(getQuoteLifecycle(b.recommended.quote));
    if (pa !== pb) return pa - pb;
    return Date.parse(b.latestUpdatedAt) - Date.parse(a.latestUpdatedAt);
  });
}

function priorityForLifecycle(lifecycle: string) {
  switch (lifecycle) {
    case 'cleanup': return 7;
    case 'revision_requested': return 1;
    case 'accepted': return 2;
    case 'sent': return 3;
    case 'pending_approval': return 4;
    case 'draft': return 5;
    case 'expired': return 8;
    case 'rejected': return 9;
    default: return 6;
  }
}

function formatDate(value?: string | null) {
  if (!value) return 'No date';
  try { return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)); }
  catch { return value; }
}


type CustomerSection = {
  title: string;
  caption: string;
  groups: CustomerGroup[];
  tone: string;
  openByDefault: boolean;
};

function buildCustomerSections(customerGroups: CustomerGroup[], groupMode: string): CustomerSection[] {
  const makeSection = (title: string, caption: string, groups: CustomerGroup[], tone: string, openByDefault = true): CustomerSection => ({ title, caption, groups, tone, openByDefault });

  if (groupMode === 'customer') {
    return [makeSection('All Customers', 'Alphabetical customer stories', [...customerGroups].sort((a, b) => a.companyName.localeCompare(b.companyName)), '#0c7fff', true)]
      .filter((section) => section.groups.length > 0);
  }

  if (groupMode === 'lifecycle') {
    return [
      makeSection('Follow-up Due', 'Sent quotes need outcomes', customerGroups.filter((group) => group.sentCount > 0), '#0c7fff', true),
      makeSection('Revision Requested', 'Buyer asked for a better quote', customerGroups.filter((group) => group.revisionCount > 0), '#d97706', true),
      makeSection('Order Handoff', 'Accepted value ready for Orders', customerGroups.filter((group) => group.acceptedCount > 0), '#059669', true),
      makeSection('Cleanup / Void', 'Zero-value stale records', customerGroups.filter((group) => group.cleanupCount > 0), '#64748b', false),
      makeSection('Archive / Closed', 'Expired or rejected history', customerGroups.filter((group) => group.archiveCount > 0), '#64748b', false),
    ].filter((section) => section.groups.length > 0);
  }

  if (groupMode === 'value') {
    return [
      makeSection('High Value', 'Exposure above USD 1,000', customerGroups.filter((group) => getCustomerExposure(group) >= 1000), '#059669', true),
      makeSection('Standard Value', 'Exposure below USD 1,000', customerGroups.filter((group) => getCustomerExposure(group) > 0 && getCustomerExposure(group) < 1000), '#0c7fff', true),
      makeSection('No Active Value', 'Cleanup, archive, or draft records', customerGroups.filter((group) => getCustomerExposure(group) <= 0), '#64748b', false),
    ].filter((section) => section.groups.length > 0);
  }

  if (groupMode === 'product') {
    const productMap = new Map<string, CustomerGroup[]>();
    for (const group of customerGroups) {
      const product = group.recommended.quote.lineItems[0]?.productName ?? 'No product / cleanup';
      productMap.set(product, [...(productMap.get(product) ?? []), group]);
    }
    return [...productMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([product, groups]) => makeSection(product, 'Grouped by primary selected quote product', groups, '#0c7fff', groups.length <= 8));
  }

  return [
    makeSection('Revision Requested', 'Buyer asked for a better quote', customerGroups.filter((group) => group.revisionCount > 0), '#d97706', true),
    makeSection('Order Handoff', 'Accepted value ready for Orders', customerGroups.filter((group) => group.revisionCount === 0 && group.acceptedCount > 0), '#059669', true),
    makeSection('Follow-up Due', 'Sent quotes need outcomes', customerGroups.filter((group) => group.revisionCount === 0 && group.acceptedCount === 0 && group.sentCount > 0), '#0c7fff', true),
    makeSection('Cleanup / Void', 'Zero-value records are not active risk', customerGroups.filter((group) => group.revisionCount === 0 && group.acceptedCount === 0 && group.sentCount === 0 && group.cleanupCount > 0), '#64748b', false),
    makeSection('Archive / Closed', 'Expired or rejected history', customerGroups.filter((group) => group.revisionCount === 0 && group.acceptedCount === 0 && group.sentCount === 0 && group.cleanupCount === 0 && group.archiveCount > 0), '#64748b', false),
    makeSection('Draft / Other', 'Quotes still being prepared', customerGroups.filter((group) => group.revisionCount === 0 && group.acceptedCount === 0 && group.sentCount === 0 && group.cleanupCount === 0 && group.archiveCount === 0), '#64748b', true),
  ].filter((section) => section.groups.length > 0);
}

async function insertLifecycleEvent(db: any, payload: {
  organizationId: string;
  quoteId: string;
  leadId?: string | null;
  eventType: string;
  outcome: string;
  actorName?: string | null;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  return db.from('quote_lifecycle_events').insert({
    organization_id: payload.organizationId,
    quote_id: payload.quoteId,
    lead_id: payload.leadId ?? null,
    event_type: payload.eventType,
    outcome: payload.outcome,
    actor_name: payload.actorName ?? 'Setu Flow',
    actor_type: 'user',
    message: payload.message,
    metadata: payload.metadata ?? {},
  });
}

export default async function QuotesPage({ searchParams }: { searchParams?: { quoteId?: string|string[]; q?: string|string[]; status?: string|string[]; company?: string|string[]; from?: string|string[]; to?: string|string[]; mode?: string|string[]; group?: string|string[] } }) {
  let workspace: Awaited<ReturnType<typeof getWorkspaceAccess>>|null = null;
  try { workspace = await getWorkspaceAccess(); } catch { return <EmptyState title="Workspace unavailable" description="Could not load workspace." />; }
  if (!hasSupabaseEnv || workspace?.missingEnv) return <EmptyState title="Configuration required" description="SETU Flow needs Supabase environment values." />;
  if (!workspace?.organization) return <EmptyState title="Workspace membership needed" description="No active organization membership." />;

  const supabase = await createClient();
  const db = supabase as any;
  const organizationId = workspace.organization.id;
  const selectedQuoteId = readSearchParam(searchParams?.quoteId).trim() || null;
  const requestedMode = readSearchParam(searchParams?.mode);
  const requestedStatus = readSearchParam(searchParams?.status);
  const requestedGroup = readSearchParam(searchParams?.group);
  const filters = {
    q: readSearchParam(searchParams?.q),
    status: FILTER_STATUSES.includes(requestedStatus as (typeof FILTER_STATUSES)[number]) ? requestedStatus : 'active',
    company: readSearchParam(searchParams?.company),
    from: readSearchParam(searchParams?.from),
    to: readSearchParam(searchParams?.to),
    mode: FILTER_MODES.includes(requestedMode as (typeof FILTER_MODES)[number]) ? requestedMode : 'all',
    group: GROUP_MODES.includes(requestedGroup as (typeof GROUP_MODES)[number]) ? requestedGroup : 'priority',
  };

  const quotesResult = await db
    .from('quotes')
    .select('id, lead_id, status, currency, notes, quote_number, created_at, updated_at, current_version_id, approval_required, approved_at, approved_by, notes_internal, archived_at, archive_reason, lifecycle_outcome, follow_up_at, last_customer_response_at')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .limit(500);
  if (quotesResult.error) return <EmptyState title="Could not load quotes" description={String(quotesResult.error.message ?? 'Unknown error')} />;
  const quotes = Array.isArray(quotesResult.data) ? quotesResult.data : [];

  if (!quotes.length) {
    return (
      <div style={{padding:'24px',background:'#f0f4f8',minHeight:'100vh'}}>
        <div className="rounded-[1.375rem] border border-slate-200 bg-white p-8 text-center">
          <p style={{fontSize:'14px',color:'#64748b'}}>No quotes yet.</p>
          <Link href={PRODUCT_ROUTES.app.leads} style={{display:'inline-block',marginTop:'16px',padding:'8px 18px',background:'#0b2e4a',color:'white',borderRadius:'8px',fontSize:'13px',fontWeight:700,textDecoration:'none'}}>+ New quote</Link>
        </div>
      </div>
    );
  }

  const leadIds = [...new Set(quotes.map((q: any) => q.lead_id).filter(Boolean))];
  const quoteIds = quotes.map((q: any) => q.id);

  const [leadsResult, versionsResult, negotiationsResult, communicationsResult, contractsResult, lineItemsResult, lifecycleEventsResult] = await Promise.all([
    db.from('leads').select('id, company_name, contact_name, lead_type').eq('organization_id', organizationId).in('id', leadIds),
    db.from('quote_versions').select('id, quote_id, version_no, status, created_at, approved_at, sent_at').in('quote_id', quoteIds).order('created_at', {ascending: false}),
    db.from('quote_negotiation_events').select('id, quote_id, event_type, message, created_at, actor_name').in('quote_id', quoteIds).order('created_at', {ascending: false}),
    db.from('communications').select('id, quote_id, subject, summary, status, created_at').in('quote_id', quoteIds).order('created_at', {ascending: false}),
    db.from('contracts').select('id, quote_id, status, signed_at, starts_on, commercial_lock_state, commercial_snapshot').eq('organization_id', organizationId).in('quote_id', quoteIds),
    db.from('quote_line_items').select('id, quote_id, product_id, quantity, unit_price, currency, catalog_price_amount, catalog_price_currency, is_price_overridden, override_reason, notes').in('quote_id', quoteIds),
    db.from('quote_lifecycle_events').select('id, quote_id, event_type, outcome, message, created_at').eq('organization_id', organizationId).in('quote_id', quoteIds).order('created_at', { ascending: false }),
  ]);

  const lineItems = Array.isArray(lineItemsResult.data) ? lineItemsResult.data : [];
  const productIds = [...new Set(lineItems.map((l: any) => l.product_id).filter(Boolean))];
  const productsResult = productIds.length ? await db.from('products').select('id, name, sku').eq('organization_id', organizationId).in('id', productIds) : { data: [], error: null };
  const variantsResult = productIds.length
    ? await db.from('product_variants').select('id, product_id, is_active, is_quoteable, units_per_case, pricing_mode_default, moq_cases, moq_kg, sort_order, pack_size_value').eq('organization_id', organizationId).in('product_id', productIds).order('product_id', { ascending: true }).order('sort_order', { ascending: true })
    : { data: [], error: null };
  const variantIds = Array.from(new Set((Array.isArray(variantsResult.data) ? variantsResult.data : []).map((variant: any) => variant.id).filter(Boolean)));
  const productPricesResult = variantIds.length
    ? await db.from('product_prices').select('id, product_variant_id, price, currency, effective_from, effective_to').in('product_variant_id', variantIds).order('effective_from', { ascending: false })
    : { data: [], error: null };
  const pricingRulesResult = productIds.length
    ? await db.from('product_pricing_rules').select('product_id, product_variant_id, is_active, is_quoteable, effective_from, effective_to, ex_factory_usd_per_case, ex_factory_usd_per_unit, fob_usd_per_case, fob_usd_per_unit, bulk_usd_per_kg, ex_factory_usd, fob_usd, ex_factory_inr, fob_inr').eq('organization_id', organizationId).in('product_id', productIds)
    : { data: [], error: null };
  const nowIso = new Date().toISOString();
  const activeByDate = (row: any) => !(row?.effective_from && String(row.effective_from) > nowIso) && !(row?.effective_to && String(row.effective_to) < nowIso);
  const priceByProductId = new Map<string, { amount: number; currency: string }>();
  for (const price of Array.isArray(productPricesResult.data) ? productPricesResult.data : []) {
    const variant = (Array.isArray(variantsResult.data) ? variantsResult.data : []).find((item: any) => item.id === price?.product_variant_id);
    const productId = variant?.product_id;
    const amount = Number(price?.price);
    if (!productId || priceByProductId.has(productId) || !activeByDate(price) || !Number.isFinite(amount) || amount <= 0) continue;
    priceByProductId.set(productId, { amount, currency: String(price.currency ?? 'USD').toUpperCase() });
  }
  for (const rule of Array.isArray(pricingRulesResult.data) ? pricingRulesResult.data : []) {
    if (!rule?.product_id || rule.is_active === false || rule.is_quoteable === false || priceByProductId.has(rule.product_id) || !activeByDate(rule)) continue;
    const amount = [rule.fob_usd_per_case, rule.fob_usd_per_unit, rule.ex_factory_usd_per_case, rule.ex_factory_usd_per_unit, rule.bulk_usd_per_kg, rule.fob_usd, rule.ex_factory_usd, rule.fob_inr, rule.ex_factory_inr]
      .map((value) => Number(value)).find((value) => Number.isFinite(value) && value > 0);
    if (amount) priceByProductId.set(rule.product_id, { amount, currency: rule.fob_inr || rule.ex_factory_inr ? 'INR' : 'USD' });
  }
  const pricedProducts = (Array.isArray(productsResult.data) ? productsResult.data : []).map((product: any) => {
    const price = priceByProductId.get(product.id);
    return price ? { ...product, catalogPriceAmount: price.amount, catalogPriceCurrency: price.currency } : product;
  });

  const lifecycleEventsByQuoteId = new Map<string, QuoteLifecycleRow[]>();
  for (const event of Array.isArray(lifecycleEventsResult.data) ? lifecycleEventsResult.data : []) {
    lifecycleEventsByQuoteId.set(event.quote_id, [...(lifecycleEventsByQuoteId.get(event.quote_id) ?? []), event]);
  }

  const baseViewModelInput = {
    quotes,
    leads: Array.isArray(leadsResult.data) ? leadsResult.data : [],
    versions: Array.isArray(versionsResult.data) ? versionsResult.data : [],
    negotiations: Array.isArray(negotiationsResult.data) ? negotiationsResult.data : [],
    communications: Array.isArray(communicationsResult.data) ? communicationsResult.data : [],
    contracts: Array.isArray(contractsResult.data) ? contractsResult.data : [],
    lineItems,
    products: pricedProducts,
  };

  const viewModel = buildQuotesPageViewModel({ ...baseViewModelInput, selectedQuoteId });
  const metaByQuoteId = new Map<string, QuoteEnhancementMeta>(quotes.map((quote: any) => [quote.id, {
    archived_at: quote.archived_at ?? null,
    archive_reason: quote.archive_reason ?? null,
    lifecycle_outcome: quote.lifecycle_outcome ?? null,
    follow_up_at: quote.follow_up_at ?? null,
    last_customer_response_at: quote.last_customer_response_at ?? null,
  }]));
  const enhancedItems: EnhancedQuoteItem[] = viewModel.items.map((item: QuoteWorkspaceItem) => ({
    ...item,
    ...(metaByQuoteId.get(item.id) ?? {}),
    lifecycleEvents: lifecycleEventsByQuoteId.get(item.id) ?? [],
  }));
  const filteredItems = filterItems(enhancedItems, filters);
  const customerGroups = groupQuotesByCustomer(filteredItems);
  const selected = (selectedQuoteId ? enhancedItems.find(i => i.id === selectedQuoteId) : null) ?? customerGroups[0]?.recommended.quote ?? filteredItems[0] ?? enhancedItems[0];
  const selectedGroup = customerGroups.find((group) => group.quotes.some((quote) => quote.id === selected?.id)) ?? groupQuotesByCustomer(selected ? [selected] : [])[0];
  const selectedMode = selected?.leadType === 'buyer' ? 'buyers' : selected?.leadType === 'supplier' ? 'suppliers' : null;
  const selectedOrderHref = selected ? buildOrdersHref({notice:'quote-accepted',quoteId:selected.id,leadId:selected.leadId,handoff:'quote-to-orders',sourceQuoteId:selected.id}, selectedMode) : PRODUCT_ROUTES.app.orders;
  const selectedSendHref = selected ? `/approval-send?quoteId=${encodeURIComponent(selected.id)}` : '/approval-send';

  async function approveSelectedQuoteAction(formData: FormData) {
    'use server';
    const quoteId = String(formData.get('quote_id') ?? '');
    const leadId = String(formData.get('lead_id') ?? '');
    const result = await approveLeadQuoteAdjustment({ leadId, quoteId, note: 'Owner/admin approved quote-only adjustment from Quotes workspace.' });
    if (result?.error) redirect(`/quotes?quoteId=${quoteId}&notice=quote-approval-error`);
    redirect(`/quotes?quoteId=${quoteId}&notice=quote-approved`);
  }

  async function rejectSelectedQuoteAction(formData: FormData) {
    'use server';
    const quoteId = String(formData.get('quote_id') ?? '');
    const leadId = String(formData.get('lead_id') ?? '');
    const note = String(formData.get('rejection_reason') ?? '').trim() || 'Quote rejected from Quotes workspace. Revise before sending.';
    const result = await rejectLeadQuoteAdjustment({ leadId, quoteId, note });
    if (result?.error) redirect(`/quotes?quoteId=${quoteId}&notice=quote-rejection-error`);
    redirect(`/quotes?quoteId=${quoteId}&notice=quote-rejected`);
  }

  async function createOrderHandoffAction(formData: FormData) {
    'use server';
    const quoteId = String(formData.get('quote_id') ?? '').trim();
    if (!quoteId) redirect('/quotes?notice=quote-order-missing');
    const result = await markQuoteAsDirectOrder(undefined, formData);
    if (result?.error) redirect(`/quotes?quoteId=${quoteId}&notice=quote-order-error`);
    const params = new URLSearchParams({ notice: 'quote-accepted', quoteId });
    const orderId = String(result.record?.orderId ?? '').trim();
    if (orderId) params.set('openOrderId', orderId);
    else params.set('sourceQuoteId', quoteId);
    redirect(`/orders?${params.toString()}`);
  }

  async function recordOutcomeAction(formData: FormData) {
    'use server';
    const quoteId = String(formData.get('quote_id') ?? '').trim();
    const outcome = String(formData.get('outcome') ?? '').trim().toLowerCase();
    const leadId = String(formData.get('lead_id') ?? '').trim();
    const notes = String(formData.get('notes') ?? '').trim();
    if (!quoteId) redirect('/quotes?notice=quote-outcome-missing');
    if (outcome === 'accepted' || outcome === 'rejected') {
      formData.set('status', outcome);
      const result = await recordQuoteOutcomeWorkflow(undefined, formData);
      if (result?.error) redirect(`/quotes?quoteId=${quoteId}&notice=quote-outcome-error`);
      if (outcome === 'accepted') redirect(`/orders?notice=quote-accepted&quoteId=${encodeURIComponent(quoteId)}&sourceQuoteId=${encodeURIComponent(quoteId)}`);
      redirect(`/quotes?status=archive&quoteId=${quoteId}&notice=quote-rejected`);
    }

    const workspace = await getWorkspaceAccess();
    if (!workspace.user || !workspace.organization) redirect('/quotes?notice=quote-auth-required');
    const currentUser = workspace.user!;
    const organization = workspace.organization!;
    const supabase: any = await createClient();
    const db: any = supabase;
    const { data: existing, error } = await db
      .from('quotes')
      .select('id, lead_id, status, organization_id, current_version_id')
      .eq('organization_id', organization.id)
      .eq('id', quoteId)
      .maybeSingle();
    if (error || !existing) redirect(`/quotes?quoteId=${quoteId}&notice=quote-outcome-error`);

    const now = new Date().toISOString();
    let updatePayload: Record<string, unknown> = { updated_at: now, last_customer_response_at: now };
    let eventType = 'quote_follow_up';
    let nextNotice = 'quote-follow-up-logged';
    let message = notes || 'Customer follow-up logged.';

    if (outcome === 'revision_requested') {
      updatePayload = { ...updatePayload, lifecycle_outcome: 'revision_requested' };
      eventType = 'revision_requested';
      nextNotice = 'quote-revision-requested';
      message = notes || 'Buyer requested a better quote. Create a governed new version; do not mutate the sent record.';
      const negotiationForm = new FormData();
      negotiationForm.set('quote_id', quoteId);
      negotiationForm.set('response_type', 'revision_requested');
      negotiationForm.set('note', message);
      await logQuoteNegotiationResponse(undefined, negotiationForm);
    } else if (outcome === 'no_response') {
      const followUpAt = new Date(Date.now() + 3 * 86_400_000).toISOString();
      updatePayload = { ...updatePayload, lifecycle_outcome: 'sent_follow_up', follow_up_at: followUpAt };
      eventType = 'no_response';
      nextNotice = 'quote-follow-up-scheduled';
      message = notes || 'No response logged. Follow-up scheduled in three days.';
    } else if (outcome === 'expired') {
      updatePayload = { ...updatePayload, status: 'expired', lifecycle_outcome: 'expired_archived', archived_at: now, archive_reason: notes || 'Quote expired and moved out of active Quote Workspace.' };
      eventType = 'expired_archived';
      nextNotice = 'quote-expired-archived';
      message = notes || 'Quote expired and moved to archive. Clone a new version if the customer re-engages.';
    }

    const { error: updateError } = await db.from('quotes').update(updatePayload).eq('organization_id', organization.id).eq('id', quoteId);
    if (updateError) redirect(`/quotes?quoteId=${quoteId}&notice=quote-outcome-error`);
    const { error: lifecycleError } = await insertLifecycleEvent(db, {
      organizationId: organization.id,
      quoteId,
      leadId: leadId || existing.lead_id,
      eventType,
      outcome,
      actorName: currentUser.email ?? currentUser.id,
      message,
      metadata: { source: 'quotes_page_lifecycle_outcome', previous_status: existing.status },
    });
    if (lifecycleError) {
      console.warn('quote lifecycle event log failed after outcome update', lifecycleError);
    }
    revalidatePath('/quotes');
    revalidatePath('/orders');
    redirect(`/quotes?quoteId=${quoteId}&notice=${nextNotice}`);
  }

  const activeItems = enhancedItems.filter((quote) => !isArchiveLifecycle(getQuoteLifecycle(quote)));
  const filteredActiveItems = filteredItems.filter((quote) => !isArchiveLifecycle(getQuoteLifecycle(quote)));
  const sentActiveCount = activeItems.filter((quote) => getQuoteLifecycle(quote) === 'sent').length;
  const revisionCount = activeItems.filter((quote) => getQuoteLifecycle(quote) === 'revision_requested').length;
  const acceptedCount = activeItems.filter((quote) => getQuoteLifecycle(quote) === 'accepted').length;
  const cleanupCount = activeItems.filter((quote) => getQuoteLifecycle(quote) === 'cleanup').length;
  const expiringSoonCount = activeItems.filter((quote) => ['amber','rose'].includes(getValidityLabel(quote).tone) && getQuoteLifecycle(quote) === 'sent').length;
  const archiveCount = enhancedItems.filter((quote) => isArchiveLifecycle(getQuoteLifecycle(quote))).length;
  const filteredValues = getValueBreakdown(filteredActiveItems);
  const selectedValues = selectedGroup ? {
    proposedValue: selectedGroup.proposedValue,
    acceptedValue: selectedGroup.acceptedValue,
    orderValue: selectedGroup.orderValue,
    cleanupValue: selectedGroup.cleanupValue,
    archiveValue: selectedGroup.archiveValue,
  } : getValueBreakdown(selected ? [selected] : []);
  const filterHref = (patch: Partial<typeof filters>) => {
    const next = { ...filters, ...patch };
    const params = new URLSearchParams();
    if (next.q.trim()) params.set('q', next.q.trim());
    if (next.status !== 'active') params.set('status', next.status);
    if (next.company.trim()) params.set('company', next.company.trim());
    if (next.from.trim()) params.set('from', next.from.trim());
    if (next.to.trim()) params.set('to', next.to.trim());
    if (next.mode !== 'all') params.set('mode', next.mode);
    if (next.group !== 'priority') params.set('group', next.group);
    return params.toString() ? `/quotes?${params.toString()}` : '/quotes';
  };
  const activeQuoteFilterChips = [
    filters.q.trim() ? { key: 'q', label: `Search: ${filters.q.trim()}`, href: filterHref({ q: '' }), tone: 'blue' as const } : null,
    filters.status !== 'active' ? { key: 'status', label: `Lifecycle: ${labelizeStatus(filters.status)}`, href: filterHref({ status: 'active' }), tone: 'amber' as const } : null,
    filters.mode !== 'all' ? { key: 'mode', label: `Global mode: ${filters.mode}`, href: filterHref({ mode: 'all' }), tone: 'violet' as const } : null,
    filters.group !== 'priority' ? { key: 'group', label: `Group: ${labelizeStatus(filters.group)}`, href: filterHref({ group: 'priority' }), tone: 'violet' as const } : null,
  ].filter(Boolean) as Array<{ key: string; label: string; href: string; tone: 'blue' | 'amber' | 'violet' }>;
  const selectedLifecycle = selected ? getQuoteLifecycle(selected) : 'draft';
  const selectedIsAccepted = selectedLifecycle === 'accepted';
  const selectedIsPending = selectedLifecycle === 'pending_approval';
  const selectedIsSent = selectedLifecycle === 'sent';
  const selectedIsRevision = selectedLifecycle === 'revision_requested';
  const selectedIsCleanup = selectedLifecycle === 'cleanup';
  const selectedIsArchive = isArchiveLifecycle(selectedLifecycle);
  const selectedStatusStyle = selected ? getStatusStyle(selected.status, selectedLifecycle) : getStatusStyle('draft');
  const selectedProducts = selected?.lineItems.slice(0, 4) ?? [];
  const customerSections = buildCustomerSections(customerGroups, filters.group);

  return (
    <div style={{fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif',fontSize:'13px',lineHeight:'1.5',color:'#1e293b'}}>
      <div style={{padding:'10px 24px 0'}}>
        <section style={{background:'white',border:'1px solid #dbe4ef',borderRadius:'20px',boxShadow:'0 10px 28px rgba(15,23,42,.06)',padding:'10px 12px'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(6,minmax(0,1fr))',gap:'8px',marginBottom:'10px'}}>
            {[
              ['Follow-up', sentActiveCount, 'Sent outcomes', 'blue', 'sent'],
              ['Revisions', revisionCount, 'Better quote', 'amber', 'revision_requested'],
              ['Order handoff', acceptedCount, 'Accepted value', 'green', 'accepted'],
              ['Cleanup', cleanupCount, 'Zero-value records', 'slate', 'cleanup'],
              ['Expiring', expiringSoonCount, 'Guru prompt', 'amber', 'sent'],
              ['Archive', archiveCount, 'Closed history', 'slate', 'archive'],
            ].map(([label,value,meta,tone,status]) => (
              <Link key={String(label)} href={filterHref({ status: String(status) })} style={{border:'1px solid #e2e8f0',borderRadius:'14px',background:'white',padding:'9px 10px',textDecoration:'none',color:'#0f172a',borderTop:`3px solid ${tone==='green'?'#059669':tone==='blue'?'#0c7fff':tone==='rose'?'#dc2626':tone==='amber'?'#d97706':'#64748b'}`}}>
                <div style={{fontSize:'9px',fontWeight:900,letterSpacing:'.12em',textTransform:'uppercase',color:'#94a3b8'}}>{label}</div>
                <div style={{display:'flex',alignItems:'baseline',gap:'6px',marginTop:'2px'}}><span style={{fontSize:'18px',fontWeight:950}}>{value}</span><span style={{fontSize:'10px',color:'#64748b',fontWeight:750}}>{meta}</span></div>
              </Link>
            ))}
          </div>
          <form action="/quotes" style={{display:'grid',gridTemplateColumns:'minmax(240px,1.25fr) repeat(6,minmax(112px,.7fr)) auto',gap:'8px',alignItems:'end'}}>
            <label style={{display:'grid',gap:'4px'}}><span style={filterLabelStyle()}>Search</span><input name="q" defaultValue={filters.q} placeholder="Customer, quote, product, contact..." style={filterInputStyle()} /></label>
            <label style={{display:'grid',gap:'4px'}}><span style={filterLabelStyle()}>Lifecycle</span><select name="status" defaultValue={filters.status} style={filterInputStyle()}>{FILTER_STATUSES.map(s => <option key={s} value={s}>{s==='all'?'All quotes':s==='active'?'Active':labelizeStatus(s)}</option>)}</select></label>
            <label style={{display:'grid',gap:'4px'}}><span style={filterLabelStyle()}>Customer</span><input name="company" defaultValue={filters.company} placeholder="Any" style={filterInputStyle()} /></label>
            <label style={{display:'grid',gap:'4px'}}><span style={filterLabelStyle()}>From</span><input name="from" type="date" defaultValue={filters.from} style={filterInputStyle()} /></label>
            <label style={{display:'grid',gap:'4px'}}><span style={filterLabelStyle()}>To</span><input name="to" type="date" defaultValue={filters.to} style={filterInputStyle()} /></label>
            <label style={{display:'grid',gap:'4px'}}><span style={filterLabelStyle()}>Mode</span><select name="mode" defaultValue={filters.mode} style={filterInputStyle()}>{FILTER_MODES.map(mode => <option key={mode} value={mode}>{mode}</option>)}</select></label>
            <label style={{display:'grid',gap:'4px'}}><span style={filterLabelStyle()}>Group</span><select name="group" defaultValue={filters.group} style={filterInputStyle()}>{GROUP_MODES.map(mode => <option key={mode} value={mode}>{labelizeStatus(mode)}</option>)}</select></label>
            <button type="submit" style={{height:'38px',border:0,borderRadius:'12px',background:'#0b1020',color:'white',fontSize:'12px',fontWeight:900,padding:'0 14px',boxShadow:'0 8px 22px rgba(15,23,42,.14)'}}>Apply</button>
          </form>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',borderTop:'1px solid #edf2f7',marginTop:'10px',paddingTop:'8px',flexWrap:'wrap'}}>
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
              {activeQuoteFilterChips.length ? activeQuoteFilterChips.map((chip) => <Link key={chip.key} href={chip.href} style={activeChipStyle(chip.tone)}>{chip.label}</Link>) : <span style={{fontSize:'11px',fontWeight:800,color:'#64748b'}}>Active lifecycle view</span>}
              {activeQuoteFilterChips.length ? <Link href="/quotes" className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-600 transition hover:bg-slate-50">Clear all</Link> : null}
            </div>
            <div style={{fontSize:'11px',fontWeight:850,color:'#64748b'}}>Proposed {formatQuoteMoney(filteredValues.proposedValue,'USD')} · Accepted {formatQuoteMoney(filteredValues.acceptedValue,'USD')} · Order {formatQuoteMoney(filteredValues.orderValue,'USD')} · Cleanup {formatQuoteMoney(filteredValues.cleanupValue,'USD')}</div>
          </div>
        </section>
      </div>

      <div className="px-5 pb-10 pt-3 flex flex-col gap-4">
        <div style={{display:'grid',gridTemplateColumns:'410px minmax(0,1fr)',gap:'16px',alignItems:'start'}}>
          <section style={{background:'white',border:'1px solid #dbe4ef',borderRadius:'24px',boxShadow:'0 10px 28px rgba(15,23,42,.06)',padding:'14px'}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'12px',marginBottom:'10px'}}>
              <div><div style={{fontSize:'10px',fontWeight:900,letterSpacing:'.18em',textTransform:'uppercase',color:'#0c7fff'}}>Customers</div><h3 style={{fontSize:'18px',fontWeight:950,margin:'2px 0 0'}}>Grouped lifecycle worklist</h3></div>
              <span style={{fontSize:'11px',color:'#64748b',fontWeight:850}}>{customerGroups.length} groups</span>
            </div>
            <div style={{display:'grid',gap:'12px',maxHeight:'calc(100vh - 250px)',overflowY:'auto',paddingRight:'2px'}}>
              {customerSections.length ? customerSections.map((section) => {
                const visibleGroups = section.groups.slice(0, 6);
                const hiddenCount = Math.max(0, section.groups.length - visibleGroups.length);
                return (
                  <details key={section.title} open={section.openByDefault} style={{border:'1px solid #edf2f7',borderRadius:'18px',background:'#fbfdff',padding:'10px'}}>
                    <summary style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'8px',marginBottom:'8px',cursor:'pointer',listStyle:'none'}}>
                      <div>
                        <div style={{fontSize:'10px',fontWeight:950,color:section.tone,textTransform:'uppercase',letterSpacing:'.14em'}}>{section.title}</div>
                        <div style={{fontSize:'10px',fontWeight:750,color:'#64748b'}}>{section.caption}</div>
                      </div>
                      <span style={{fontSize:'10px',fontWeight:950,color:'#64748b'}}>{section.groups.length} · collapse</span>
                    </summary>
                    <div style={{display:'grid',gap:'8px'}}>
                      {visibleGroups.map((group) => {
                        const tone = group.cleanupCount ? '#64748b' : group.revisionCount ? '#d97706' : group.acceptedCount ? '#059669' : group.sentCount ? '#0c7fff' : '#64748b';
                        const active = selectedGroup?.key === group.key;
                        return (
                          <Link key={group.key} href={`/quotes?quoteId=${group.recommended.quote.id}${filters.mode !== 'all' ? `&mode=${encodeURIComponent(filters.mode)}` : ''}${filters.group !== 'priority' ? `&group=${encodeURIComponent(filters.group)}` : ''}`} style={{display:'block',position:'relative',overflow:'hidden',border:'1px solid',borderColor:active ? '#0c7fff' : '#dbe4ef',boxShadow:active ? '0 0 0 3px rgba(12,127,255,.10)' : 'none',borderRadius:'16px',background:'white',padding:'11px 11px 11px 14px',textDecoration:'none',color:'#0f172a'}}>
                            <span style={{position:'absolute',left:0,top:0,bottom:0,width:'4px',background:tone}} />
                            <div style={{display:'flex',justifyContent:'space-between',gap:'10px'}}>
                              <div style={{minWidth:0}}>
                                <div style={{fontSize:'13px',fontWeight:950,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{group.companyName}</div>
                                <div style={{fontSize:'10px',color:'#64748b',fontWeight:750}}>{group.contactName ?? 'No contact'} · {group.quoteCount} quotes</div>
                              </div>
                              <div style={{fontSize:'10px',fontWeight:950,color:tone,whiteSpace:'nowrap'}}>{group.recommended.title.split(' ').slice(0,2).join(' ')}</div>
                            </div>
                            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px',marginTop:'8px'}}>
                              <span style={{fontSize:'10px',fontWeight:850,color:'#334155'}}>Proposed {formatQuoteMoney(group.proposedValue, group.quotes[0]?.currency)}</span>
                              <span style={{fontSize:'10px',fontWeight:850,color:'#047857'}}>Accepted {formatQuoteMoney(group.acceptedValue, group.quotes[0]?.currency)}</span>
                              {group.orderValue ? <span style={{fontSize:'10px',fontWeight:850,color:'#0c7fff'}}>Order {formatQuoteMoney(group.orderValue, group.quotes[0]?.currency)}</span> : null}
                              {group.cleanupCount ? <span style={{fontSize:'10px',fontWeight:850,color:'#334155'}}>Cleanup {formatQuoteMoney(group.cleanupValue, group.quotes[0]?.currency)}</span> : null}
                            </div>
                            <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginTop:'8px'}}>
                              {group.sentCount ? <span style={badgeStyle('#eff6ff','#bfdbfe','#1d4ed8')}>{group.sentCount} sent</span> : null}
                              {group.revisionCount ? <span style={badgeStyle('#fff7ed','#fed7aa','#9a3412')}>{group.revisionCount} revision</span> : null}
                              {group.acceptedCount ? <span style={badgeStyle('#ecfdf5','#a7f3d0','#047857')}>{group.acceptedCount} accepted</span> : null}
                              {group.cleanupCount ? <span style={badgeStyle('#f8fafc','#cbd5e1','#334155')}>{group.cleanupCount} cleanup</span> : null}
                              {group.archiveCount ? <span style={badgeStyle('#f8fafc','#cbd5e1','#334155')}>{group.archiveCount} archive</span> : null}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                    {hiddenCount ? <Link href={filterHref({ status: section.title === 'Archive / Closed' ? 'archive' : filters.status })} style={{display:'block',marginTop:'8px',fontSize:'11px',fontWeight:900,color:'#0c7fff',textDecoration:'none'}}>View {hiddenCount} more</Link> : null}
                  </details>
                );
              }) : <p style={{fontSize:'13px',color:'#64748b'}}>No customer groups match the active filters.</p>}
            </div>
          </section>

          {selected ? (
            <section style={{background:'white',border:'1px solid #dbe4ef',borderRadius:'24px',boxShadow:'0 10px 28px rgba(15,23,42,.06)',padding:'18px'}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'14px',borderBottom:'1px solid #e7eef6',paddingBottom:'14px',flexWrap:'wrap'}}>
                <div>
                  <div style={{fontSize:'10px',fontWeight:900,letterSpacing:'.18em',textTransform:'uppercase',color:'#0c7fff'}}>Customer quote story</div>
                  <h2 style={{margin:'2px 0 0',fontSize:'24px',fontWeight:950,letterSpacing:'-.035em'}}>{selectedGroup?.companyName ?? selected.companyName}</h2>
                  <p style={{margin:'4px 0 0',fontSize:'12px',color:'#64748b'}}>{selectedGroup?.contactName ?? selected.contactName ?? 'No contact'} · {selectedGroup?.quoteCount ?? 1} quote records · selected {selected.quoteNumber ?? selected.id.slice(0,8)}</p>
                </div>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                  <span style={{display:'inline-flex',alignItems:'center',border:'1px solid',borderColor:selectedStatusStyle.border,background:selectedStatusStyle.bg,color:selectedStatusStyle.color,borderRadius:'999px',padding:'6px 11px',fontSize:'11px',fontWeight:900,textTransform:'capitalize'}}>{selectedLifecycle === 'cleanup' ? 'cleanup' : labelizeStatus(selected.lifecycle_outcome || selected.status)}</span>
                  {selectedQuoteId ? <Link href={filterHref({})} style={{border:'1px solid #e2e8f0',background:'white',borderRadius:'999px',padding:'6px 11px',fontSize:'11px',fontWeight:850,color:'#475569',textDecoration:'none'}}>Close focus</Link> : null}
                </div>
              </div>

              <div style={{marginTop:'14px',display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:'10px'}}>
                {[
                  ['Proposed', formatQuoteMoney(selectedValues.proposedValue, selected.currency), '#0b2e4a'],
                  ['Accepted', formatQuoteMoney(selectedValues.acceptedValue, selected.currency), '#047857'],
                  ['Order value', formatQuoteMoney(selectedValues.orderValue, selected.currency), '#0c7fff'],
                  ['Cleanup', formatQuoteMoney(selectedValues.cleanupValue, selected.currency), '#334155'],
                  ['Exposure', formatQuoteMoney(Math.max(selectedValues.proposedValue, selectedValues.acceptedValue, selectedValues.orderValue), selected.currency), '#0f172a'],
                ].map(([label,value,color]) => (
                  <div key={label} style={{border:'1px solid #e2e8f0',borderRadius:'16px',background:'white',padding:'11px 12px'}}>
                    <div style={{fontSize:'9px',fontWeight:900,letterSpacing:'.14em',textTransform:'uppercase',color:'#94a3b8'}}>{label}</div>
                    <div style={{marginTop:'4px',fontSize:'14px',fontWeight:900,color:String(color)}}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{marginTop:'8px',display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:'8px'}}>
                {[
                  ['Selected lines', String(selected.lineItems.length)],
                  ['Version', `v${selected.totalVersions || 1}`],
                  ['Validity', getValidityLabel(selected).label],
                  ['Selected quote', formatQuoteMoney(selected.subtotal, selected.currency)],
                ].map(([label,value]) => (
                  <div key={label} style={{border:'1px solid #edf2f7',borderRadius:'14px',background:'#fbfdff',padding:'9px 10px'}}>
                    <div style={{fontSize:'9px',fontWeight:900,letterSpacing:'.12em',textTransform:'uppercase',color:'#94a3b8'}}>{label}</div>
                    <div style={{marginTop:'3px',fontSize:'12px',fontWeight:900,color:'#0f172a'}}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{marginTop:'14px',border:'1px solid',borderColor:selectedIsCleanup ? '#cbd5e1' : selectedIsAccepted ? '#a7f3d0' : selectedIsRevision ? '#fed7aa' : '#dbe4ef',borderRadius:'20px',background:selectedIsCleanup ? '#f8fafc' : selectedIsAccepted ? '#ecfdf5' : selectedIsRevision ? '#fff7ed' : '#f8fbff',padding:'14px',display:'grid',gridTemplateColumns:'minmax(0,1fr) 280px',gap:'14px',alignItems:'start'}}>
                <div>
                  <div style={{fontSize:'10px',fontWeight:900,letterSpacing:'.14em',textTransform:'uppercase',color:selectedIsCleanup ? '#334155' : selectedIsAccepted ? '#047857' : selectedIsRevision ? '#9a3412' : '#1d4ed8'}}>Recommended next action</div>
                  <h3 style={{margin:'4px 0 0',fontSize:'20px',fontWeight:950,color:'#0f172a'}}>
                    {selectedIsCleanup ? 'Review quote cleanup' : selectedIsRevision ? 'Create governed revision' : selectedIsAccepted ? 'Move revenue work to Orders' : selectedIsPending ? 'Approval required' : selectedIsSent ? 'Follow up and log outcome' : selectedIsArchive ? 'Archive or clone' : 'Continue quote'}
                  </h3>
                  <p style={{margin:'6px 0 0',fontSize:'12px',lineHeight:1.6,color:'#64748b'}}>
                    {selectedIsCleanup ? 'This stale quote has no commercial lines or value. It should be archived or voided, not treated as customer-level risk.' : selectedIsRevision ? 'Buyer requested a better quote. Keep the sent record locked and create a governed new version.' : selectedIsAccepted ? 'Accepted quote is live revenue intent. The quote stays locked while Orders owns execution.' : selectedIsPending ? 'Review quote-only adjustments before the quote can be sent.' : selectedIsSent ? 'Follow-up means capture the outcome: accepted, rejected, revision requested, no response, or expired.' : selectedIsArchive ? 'Expired/rejected quotes leave active work but stay searchable and cloneable.' : 'Finish quote lines and readiness before sending.'}
                  </p>
                </div>
                <div style={{display:'grid',gap:'8px'}}>
                  {selectedIsAccepted ? (
                    <form action={createOrderHandoffAction} style={{display:'grid',gap:'8px'}}>
                      <input type="hidden" name="quote_id" value={selected.id}/>
                      <input type="hidden" name="notes" value="Order handoff created from Quotes lifecycle command center."/>
                      <button type="submit" style={primaryButton('#059669')}>Create / open order handoff</button>
                      <Link href={selectedOrderHref} style={secondaryLink('#047857','#a7f3d0')}>Open order workspace</Link>
                    </form>
                  ) : selectedIsPending ? (
                    <>
                      <form action={approveSelectedQuoteAction} style={{display:'grid',gap:'8px'}}>
                        <input type="hidden" name="quote_id" value={selected.id}/><input type="hidden" name="lead_id" value={selected.leadId}/>
                        <button type="submit" style={primaryButton('#059669')}>Approve quote adjustment</button>
                      </form>
                      <form action={rejectSelectedQuoteAction} style={{display:'grid',gap:'8px'}}>
                        <input type="hidden" name="quote_id" value={selected.id}/><input type="hidden" name="lead_id" value={selected.leadId}/>
                        <textarea name="rejection_reason" required placeholder="Rejection reason required" rows={3} style={{border:'1px solid #fecaca',borderRadius:'12px',padding:'10px',fontSize:'12px'}} />
                        <button type="submit" style={secondaryButton('#dc2626','#fecaca')}>Reject / request revision</button>
                      </form>
                    </>
                  ) : selectedIsArchive ? (
                    <>
                      <Link href={buildLeadQuoteHref(selected.leadId,selected.id,selectedMode,{handoff:'quote-revise'})} style={primaryLink('#334155')}>Clone / create new version</Link>
                      <Link href={`/api/quotes/${selected.id}/pdf`} target="_blank" style={secondaryLink('#334155','#dbe4ef')}>Open archived PDF</Link>
                    </>
                  ) : (
                    <>
                      <form action={recordOutcomeAction} style={{display:'grid',gap:'8px'}}>
                        <input type="hidden" name="quote_id" value={selected.id}/>
                        <input type="hidden" name="lead_id" value={selected.leadId}/>
                        <input type="hidden" name="outcome" value={selectedIsRevision ? 'revision_requested' : 'no_response'}/>
                        <input type="hidden" name="notes" value={selectedIsRevision ? 'Buyer requested a better quote. Create a governed revision.' : 'No response yet. Follow-up scheduled.'}/>
                        <button type="submit" style={primaryButton(selectedIsRevision ? '#d97706' : '#0b2e4a')}>{selectedIsRevision ? 'Keep locked and create revision' : 'Log no response / schedule follow-up'}</button>
                      </form>
                      <Link href={selectedSendHref} style={secondaryLink('#334155','#dbe4ef')}>Open send / response workflow</Link>
                    </>
                  )}
                  <Link href={`/api/quotes/${selected.id}/pdf`} target="_blank" style={secondaryLink('#334155','#dbe4ef')}>Customer PDF</Link>
                  <Link href={buildLeadQuoteHref(selected.leadId,selected.id,selectedMode,{handoff:'quote-revise'})} style={secondaryLink('#334155','#dbe4ef')}>Edit / revise quote</Link>
                  <DiscussionButton entityType="quote" entityId={selected.id} organizationId={organizationId} currentUserId={workspace?.user?.id ?? ''} currentUserName={workspace?.profile?.full_name ?? workspace?.user?.email ?? 'User'} title={`Quote ${selected.quoteNumber ?? selected.id.slice(0,8)} discussion`} autoEnrollUsers={[workspace?.user?.id ?? ''].filter(Boolean)} />
                </div>
              </div>

              {!selectedIsArchive ? (
                <div style={{marginTop:'12px',display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:'8px'}}>
                  {[
                    ['accepted','Mark accepted','Lock quote and move to Orders'],
                    ['rejected','Mark rejected','Capture reason and archive'],
                    ['revision_requested','Revision requested','Create governed version'],
                    ['no_response','No response','Schedule follow-up'],
                    ['expired','Expire quote','Archive and allow clone'],
                  ].map(([outcome,label,help]) => (
                    <form key={outcome} action={recordOutcomeAction} style={{display:'grid'}}>
                      <input type="hidden" name="quote_id" value={selected.id}/>
                      <input type="hidden" name="lead_id" value={selected.leadId}/>
                      <input type="hidden" name="outcome" value={outcome}/>
                      <input type="hidden" name="notes" value={help}/>
                      <button type="submit" style={{border:'1px solid #e2e8f0',background:'white',borderRadius:'14px',padding:'10px',textAlign:'left',cursor:'pointer'}}>
                        <strong style={{display:'block',fontSize:'12px',color:'#0f172a'}}>{label}</strong>
                        <span style={{display:'block',fontSize:'10px',color:'#64748b',marginTop:'2px'}}>{help}</span>
                      </button>
                    </form>
                  ))}
                </div>
              ) : null}

              <div style={{marginTop:'14px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                <div style={{border:'1px solid #e2e8f0',borderRadius:'18px',background:'white',padding:'14px'}}>
                  <div style={{fontSize:'10px',fontWeight:900,letterSpacing:'.14em',textTransform:'uppercase',color:'#94a3b8'}}>Commercial lines</div>
                  <div style={{marginTop:'8px',display:'grid',gap:'8px'}}>
                    {selectedProducts.length ? selectedProducts.map(line => (
                      <div key={line.id} style={{display:'flex',justifyContent:'space-between',gap:'12px',borderBottom:'1px solid #f1f5f9',paddingBottom:'8px'}}>
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:'12px',fontWeight:850,color:'#0f172a',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{line.productName}</div>
                          <div style={{fontSize:'10px',color:'#64748b'}}>Qty {line.quantity}{line.isPriceOverridden ? ' · adjusted' : ''}</div>
                        </div>
                        <div style={{fontSize:'12px',fontWeight:900,color:'#0b2e4a',whiteSpace:'nowrap'}}>{formatQuoteMoney(line.quantity*(line.unitPrice??0),line.currency)}</div>
                      </div>
                    )) : <div style={{fontSize:'12px',color:selectedIsCleanup ? '#334155' : '#64748b',fontWeight:selectedIsCleanup ? 850 : 500}}>No quote lines are attached. {selectedIsCleanup ? 'Archive or void this cleanup record.' : ''}</div>}
                  </div>
                </div>
                <div style={{border:'1px solid #e2e8f0',borderRadius:'18px',background:'white',padding:'14px'}}>
                  <div style={{fontSize:'10px',fontWeight:900,letterSpacing:'.14em',textTransform:'uppercase',color:'#94a3b8'}}>Setu Guru guidance</div>
                  <p style={{fontSize:'12px',lineHeight:1.6,color:'#64748b',margin:'8px 0 0'}}>
                    {selectedIsCleanup ? 'Guru keeps this zero-value record out of active value and recommends archive, void, or clone only if needed.' : selectedIsAccepted ? 'Guru sends this to Orders because the quote is now live revenue intent.' : selectedIsRevision ? 'Guru keeps the original quote locked and starts a governed revised version.' : selectedIsSent ? 'Guru asks the rep to log a real outcome instead of leaving follow-up ambiguous.' : selectedIsArchive ? 'Guru keeps this searchable in Archive and offers clone-new-version.' : 'Guru checks readiness and suggests the next lifecycle step.'}
                  </p>
                  {selected?.lifecycleEvents?.length ? <div style={{marginTop:'8px',fontSize:'11px',color:'#64748b'}}>Latest lifecycle: {selected.lifecycleEvents[0]?.outcome ?? selected.lifecycleEvents[0]?.event_type} · {formatDate(selected.lifecycleEvents[0]?.created_at)}</div> : null}
                </div>
              </div>

              {selectedGroup?.quotes?.length ? (
                <div style={{marginTop:'18px'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',marginBottom:'10px'}}>
                    <div><div style={{fontSize:'10px',fontWeight:900,letterSpacing:'.18em',textTransform:'uppercase',color:'#0c7fff'}}>Lifecycle timeline</div><h3 style={{fontSize:'18px',fontWeight:950,margin:'2px 0 0'}}>Quotes for this customer</h3></div>
                    <span style={{fontSize:'11px',color:'#64748b',fontWeight:850}}>Outcomes are explicit</span>
                  </div>
                  <div style={{display:'grid',gap:'10px'}}>
                    {selectedGroup.quotes.map((quote) => {
                      const lifecycle = getQuoteLifecycle(quote);
                      const sc = getStatusStyle(quote.status, lifecycle);
                      const archived = isArchiveLifecycle(lifecycle);
                      return (
                        <Link key={quote.id} href={`/quotes?quoteId=${quote.id}${filters.mode !== 'all' ? `&mode=${encodeURIComponent(filters.mode)}` : ''}${filters.group !== 'priority' ? `&group=${encodeURIComponent(filters.group)}` : ''}`} style={{display:'grid',gridTemplateColumns:'130px minmax(0,1fr) 120px 150px',gap:'12px',border:'1px solid',borderColor:quote.id === selected.id ? '#93c5fd' : archived ? '#cbd5e1' : '#dbe4ef',borderRadius:'18px',background:archived ? '#f8fafc' : quote.id === selected.id ? '#f8fbff' : 'white',padding:'12px',alignItems:'center',textDecoration:'none',color:'#0f172a',opacity:archived ? .78 : 1}}>
                          <div><span style={{display:'inline-flex',border:'1px solid',borderColor:sc.border,background:sc.bg,color:sc.color,borderRadius:'999px',padding:'4px 9px',fontSize:'10px',fontWeight:950,textTransform:'capitalize'}}>{lifecycle === 'cleanup' ? 'cleanup' : labelizeStatus(lifecycle)}</span><div style={{marginTop:'6px',fontSize:'11px',fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace',color:'#64748b'}}>{quote.quoteNumber ?? quote.id.slice(0,8)}</div></div>
                          <div style={{minWidth:0}}><div style={{fontSize:'13px',fontWeight:950,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{quote.lineItems[0]?.productName ?? 'No product'}</div><div style={{fontSize:'11px',color:'#64748b'}}>{quote.lineItems.length} lines · updated {formatDate(quote.updatedAt)} · {quote.archive_reason ?? quote.lifecycle_outcome ?? quote.status}</div></div>
                          <div style={{fontSize:'12px',fontWeight:950}}>{formatQuoteMoney(quote.subtotal, quote.currency)}</div>
                          <div style={{fontSize:'11px',fontWeight:900,color:sc.color,textAlign:'right'}}>{getQuoteActionLabel(quote)}</div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function badgeStyle(bg: string, border: string, color: string): CSSProperties {
  return { display:'inline-flex',border:'1px solid',borderColor:border,background:bg,color,borderRadius:'999px',padding:'4px 8px',fontSize:'10px',fontWeight:950 };
}
function primaryButton(background: string): CSSProperties {
  return { border:0,textAlign:'center',padding:'12px 14px',borderRadius:'14px',background,color:'white',fontWeight:950,cursor:'pointer' };
}
function secondaryButton(color: string, borderColor: string): CSSProperties {
  return { border:'1px solid',borderColor,textAlign:'center',padding:'10px 12px',borderRadius:'14px',background:'white',color,fontWeight:900,cursor:'pointer' };
}
function primaryLink(background: string): CSSProperties {
  return { display:'block',textAlign:'center',padding:'12px 14px',borderRadius:'14px',background,color:'white',fontWeight:950,textDecoration:'none' };
}
function secondaryLink(color: string, borderColor: string): CSSProperties {
  return { display:'block',textAlign:'center',padding:'10px 12px',borderRadius:'14px',border:'1px solid',borderColor,background:'white',color,fontWeight:900,textDecoration:'none' };
}

function filterLabelStyle(): CSSProperties {
  return { fontSize:'9px', fontWeight:950, letterSpacing:'.14em', color:'#94a3b8', textTransform:'uppercase' };
}
function filterInputStyle(): CSSProperties {
  return { height:'38px', border:'1px solid #dbe4ef', borderRadius:'12px', padding:'0 11px', fontSize:'12px', fontWeight:800, color:'#0f172a', background:'white', minWidth:0 };
}

function activeChipStyle(tone: 'blue' | 'amber' | 'violet'): CSSProperties {
  const tones = {
    blue: { background:'#eff6ff', border:'#bfdbfe', color:'#1d4ed8' },
    amber: { background:'#fffbeb', border:'#fde68a', color:'#92400e' },
    violet: { background:'#f5f3ff', border:'#ddd6fe', color:'#6d28d9' },
  }[tone];
  return { display:'inline-flex', alignItems:'center', border:'1px solid', borderColor:tones.border, background:tones.background, color:tones.color, borderRadius:'999px', padding:'4px 9px', fontSize:'11px', fontWeight:900, textDecoration:'none' };
}
