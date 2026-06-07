import Link from 'next/link';
import { redirect } from 'next/navigation';
import { EmptyState } from '@/components/ui/empty-state';
import { PremiumActiveChip, PremiumCommandBar, PremiumField, PremiumInput, PremiumSelect } from '@/components/ui/premium-command-bar';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { buildQuotesPageViewModel } from '@/features/quotes/logic/build-quotes-page-view-model';
import { QuoteHistoryList } from '@/features/quotes/ui/quote-history-list';
import { formatQuoteMoney } from '@/features/quotes/logic/formatting';
import { buildApprovalSendHref, buildLeadQuoteHref, buildOrdersHref } from '@/lib/workflow/handoffs';
import { approveLeadQuoteAdjustment, rejectLeadQuoteAdjustment } from '@/features/leads/server/actions';
import { markQuoteAsDirectOrder } from '@/features/quotes/server/actions';

const FILTER_STATUSES = ['all','draft','internal_review','pending_approval','approved','sent','revised','accepted','rejected','expired'];
const FILTER_MODES = ['all','buyers','suppliers'];

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

function getQuoteActionLabel(item: QuoteWorkspaceItem) {
  if (item.status === 'pending_approval') return 'Review';
  if (item.status === 'approved') return 'Send';
  if (item.status === 'accepted' || item.hasAcceptedContract) return 'Order';
  if (['draft','revised','internal_review'].includes(item.status)) return 'Continue';
  if (item.status === 'sent') return 'Follow up';
  return 'Open';
}

function getValidityLabel(item: QuoteWorkspaceItem) {
  if (item.status === 'accepted' || item.hasAcceptedContract) return { label: 'Order ready', rose: false, amber: false, emerald: true };
  if (item.status === 'draft') return { label: 'Not sent', rose: false, amber: false, emerald: false };
  if (item.status === 'expired') return { label: 'Expired', rose: true, amber: false, emerald: false };
  const updatedAt = Date.parse(item.updatedAt);
  if (!Number.isFinite(updatedAt)) return { label: 'Validity unknown', rose: false, amber: false, emerald: false };
  const daysSinceUpdate = Math.floor((Date.now() - updatedAt) / (24*60*60*1000));
  const daysLeft = Math.max(0, 7 - daysSinceUpdate);
  if (daysLeft <= 1) return { label: `${daysLeft} days left!`, rose: true, amber: false, emerald: false };
  if (daysLeft <= 4) return { label: `${daysLeft} days left`, rose: false, amber: true, emerald: false };
  return { label: `${daysLeft} days left`, rose: false, amber: false, emerald: false };
}

function filterItems(items: ReturnType<typeof buildQuotesPageViewModel>['items'], f: {q:string;status:string;company:string;from:string;to:string;mode:string}) {
  const q = f.q.trim().toLowerCase();
  const company = f.company.trim().toLowerCase();
  const from = readIsoDate(f.from);
  const to = readIsoDate(f.to);
  const toEnd = to == null ? null : to + 24*60*60*1000 - 1;
  const status = f.status === 'all' ? '' : f.status;
  const mode = f.mode === 'buyers' ? 'buyer' : f.mode === 'suppliers' ? 'supplier' : '';
  return items.filter(item => {
    const productNames = item.lineItems.map(l => l.productName).join(' ');
    const haystack = `${item.quoteNumber??''} ${item.id} ${item.companyName} ${productNames}`.toLowerCase();
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

function getStatusStyle(status: string) {
  const statusColors: Record<string,{bg:string;border:string;color:string}> = {
    draft:{bg:'#f1f5f9',border:'#e2e8f0',color:'#475569'},
    internal_review:{bg:'#f1f5f9',border:'#e2e8f0',color:'#475569'},
    pending_approval:{bg:'#fffbeb',border:'#fde68a',color:'#92400e'},
    approved:{bg:'#ecfdf5',border:'#a7f3d0',color:'#059669'},
    sent:{bg:'#fffbeb',border:'#fde68a',color:'#92400e'},
    revised:{bg:'#f0f9ff',border:'#bae6fd',color:'#0284c7'},
    accepted:{bg:'#ede9fe',border:'#c4b5fd',color:'#5b21b6'},
    rejected:{bg:'#fff1f2',border:'#fecaca',color:'#dc2626'},
    expired:{bg:'#f1f5f9',border:'#e2e8f0',color:'#64748b'},
  };
  return statusColors[status] ?? statusColors.draft;
}

export default async function QuotesPage({ searchParams }: { searchParams?: { quoteId?: string|string[]; q?: string|string[]; status?: string|string[]; company?: string|string[]; from?: string|string[]; to?: string|string[]; mode?: string|string[] } }) {
  let workspace: Awaited<ReturnType<typeof getWorkspaceAccess>>|null = null;
  try { workspace = await getWorkspaceAccess(); } catch { return <EmptyState title="Workspace unavailable" description="Could not load workspace." />; }
  if (!hasSupabaseEnv || workspace?.missingEnv) return <EmptyState title="Configuration required" description="SETU Flow needs Supabase environment values." />;
  if (!workspace?.organization) return <EmptyState title="Workspace membership needed" description="No active organization membership." />;

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

  const quotesResult = await db.from('quotes').select('id, lead_id, status, currency, notes, quote_number, created_at, updated_at, current_version_id, approval_required, approved_at, approved_by, notes_internal').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(200);
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

  const [leadsResult, versionsResult, negotiationsResult, communicationsResult, contractsResult, lineItemsResult] = await Promise.all([
    db.from('leads').select('id, company_name, contact_name, lead_type').eq('organization_id', organizationId).in('id', leadIds),
    db.from('quote_versions').select('id, quote_id, version_no, status, created_at, approved_at, sent_at').in('quote_id', quoteIds).order('created_at', {ascending: false}),
    db.from('quote_negotiation_events').select('id, quote_id, event_type, message, created_at, actor_name').in('quote_id', quoteIds).order('created_at', {ascending: false}),
    db.from('communications').select('id, quote_id, subject, summary, status, created_at').in('quote_id', quoteIds).order('created_at', {ascending: false}),
    db.from('contracts').select('id, quote_id, status, signed_at, starts_on, commercial_lock_state, commercial_snapshot').eq('organization_id', organizationId).in('quote_id', quoteIds),
    db.from('quote_line_items').select('id, quote_id, product_id, quantity, unit_price, currency, catalog_price_amount, catalog_price_currency, is_price_overridden, override_reason, notes').in('quote_id', quoteIds),
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
  const filteredItems = filterItems(viewModel.items, filters);
  const selected = (selectedQuoteId ? viewModel.items.find(i => i.id === selectedQuoteId) : null) ?? filteredItems[0] ?? viewModel.selectedItem;
  const selectedMode = selected?.leadType === 'buyer' ? 'buyers' : selected?.leadType === 'supplier' ? 'suppliers' : null;
  const selectedApprovalHref = selected ? buildApprovalSendHref({queue:'approvals',quoteId:selected.id,leadId:selected.leadId,handoff:'quote-approval-status'}, selectedMode) : PRODUCT_ROUTES.app.integrations;
  const selectedOrderHref = selected ? buildOrdersHref({notice:'quote-accepted',quoteId:selected.id,leadId:selected.leadId,handoff:'quote-to-orders',sourceQuoteId:selected.id}, selectedMode) : PRODUCT_ROUTES.app.orders;
  const selectedSendHref = selected ? `/approval-send?quoteId=${encodeURIComponent(selected.id)}` : '/approval-send';
  const selectedHistory = selected ? (selected.id === viewModel.selectedItem?.id ? viewModel.selectedHistory : buildQuotesPageViewModel({...baseViewModelInput, selectedQuoteId:selected.id}).selectedHistory) : [];

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

  const approvalQueue = viewModel.items.filter(i => i.status === 'pending_approval');
  const approvalQueueCount = approvalQueue.length;
  const expiringSoonCount = viewModel.items.filter(i => { const v = getValidityLabel(i); return v.rose && i.status !== 'expired'; }).length;
  const sentActiveCount = viewModel.items.filter(i => ['sent','approved','negotiating'].includes(i.status)).length;
  const draftCount = viewModel.items.filter(i => ['draft','internal_review','revised'].includes(i.status)).length;
  const acceptedCount = viewModel.items.filter(i => i.status === 'accepted' || i.hasAcceptedContract).length;
  const totalValue = viewModel.items.reduce((s, i) => s + i.subtotal, 0);
  const firstApproval = approvalQueue[0];
  const secondApproval = approvalQueue[1];
  const filterHref = (patch: Partial<typeof filters>) => {
    const next = { ...filters, ...patch };
    const params = new URLSearchParams();
    if (next.q.trim()) params.set('q', next.q.trim());
    if (next.status !== 'all') params.set('status', next.status);
    if (next.company.trim()) params.set('company', next.company.trim());
    if (next.from.trim()) params.set('from', next.from.trim());
    if (next.to.trim()) params.set('to', next.to.trim());
    if (next.mode !== 'all') params.set('mode', next.mode);
    return params.toString() ? `/quotes?${params.toString()}` : '/quotes';
  };
  const activeQuoteFilterChips = [
    filters.q.trim() ? { key: 'q', label: `Search: ${filters.q.trim()}`, href: filterHref({ q: '' }), tone: 'blue' as const } : null,
    filters.status !== 'all' ? { key: 'status', label: `Status: ${labelizeStatus(filters.status)}`, href: filterHref({ status: 'all' }), tone: 'amber' as const } : null,
    filters.mode !== 'all' ? { key: 'mode', label: `Global mode: ${filters.mode}`, href: filterHref({ mode: 'all' }), tone: 'violet' as const } : null,
  ].filter(Boolean) as Array<{ key: string; label: string; href: string; tone: 'blue' | 'amber' | 'violet' }>;
  const selectedIsAccepted = Boolean(selected && (selected.status === 'accepted' || selected.hasAcceptedContract));
  const selectedIsPending = Boolean(selected && selected.status === 'pending_approval');
  const selectedIsSent = Boolean(selected && selected.status === 'sent');
  const selectedIsDraftLike = Boolean(selected && ['draft','internal_review','revised'].includes(selected.status));
  const selectedStatusStyle = selected ? getStatusStyle(selected.status) : getStatusStyle('draft');
  const queueItems = filteredItems.slice(0, 18);
  const selectedProducts = selected?.lineItems.slice(0, 4) ?? [];

  return (
    <div style={{fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif',fontSize:'13px',lineHeight:'1.5',color:'#1e293b'}}>
      <form action="/quotes" style={{padding:'14px 24px 0'}}>
        {filters.mode !== 'all' ? <input type="hidden" name="mode" value={filters.mode} /> : null}
        <PremiumCommandBar
          label="Quote filters"
          summary={<>{filteredItems.length} quotes · {formatQuoteMoney(totalValue,'USD')} total value</>}
          activeChips={activeQuoteFilterChips.length ? <>{activeQuoteFilterChips.map((chip) => <PremiumActiveChip key={chip.key} label={chip.label} href={chip.href} tone={chip.tone} />)}</> : null}
          reset={activeQuoteFilterChips.length ? <Link href="/quotes" className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-600 transition hover:bg-slate-50">Clear all</Link> : null}
        >
          <PremiumField label="Search" icon="Search" className="md:min-w-[320px]">
            <PremiumInput name="q" defaultValue={filters.q} placeholder="Search company, quote ref, product..." />
          </PremiumField>
          <PremiumField label="Status" icon="Status" className="md:min-w-[210px]">
            <PremiumSelect name="status" defaultValue={filters.status}>
              {FILTER_STATUSES.map(s => <option key={s} value={s}>{s==='all'?'All statuses':labelizeStatus(s)}</option>)}
            </PremiumSelect>
          </PremiumField>
          <button type="submit" className="h-9 rounded-xl bg-slate-950 px-4 text-xs font-extrabold text-white shadow-[0_10px_24px_rgba(15,23,42,.14)] transition hover:bg-slate-800">Apply</button>
        </PremiumCommandBar>
      </form>

      <div className="px-5 pb-10 pt-3 flex flex-col gap-4">
        {selected ? (
          <section style={{background:'linear-gradient(135deg,#ffffff,#f8fbff)',border:'1px solid #dbe4ef',borderRadius:'26px',boxShadow:'0 18px 55px rgba(15,23,42,.10)',overflow:'hidden'}}>
            <div style={{padding:'18px 22px',display:'grid',gridTemplateColumns:'minmax(0,1fr) 340px',gap:'18px',alignItems:'stretch'}}>
              <div>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'14px',flexWrap:'wrap'}}>
                  <div>
                    <div style={{fontSize:'10px',fontWeight:900,letterSpacing:'.18em',textTransform:'uppercase',color:'#0c7fff'}}>Focused quote</div>
                    <h2 style={{margin:'4px 0 0',fontSize:'26px',fontWeight:950,letterSpacing:'-.04em',color:'#0f172a'}}>{selected.companyName}</h2>
                    <div style={{marginTop:'4px',fontSize:'12px',color:'#64748b'}}>{selected.quoteNumber ?? selected.id.slice(0,8)} · v{selected.totalVersions || 1} · {selected.contactName ?? 'No contact set'}</div>
                  </div>
                  <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                    <span style={{display:'inline-flex',alignItems:'center',border:'1px solid',borderColor:selectedStatusStyle.border,background:selectedStatusStyle.bg,color:selectedStatusStyle.color,borderRadius:'999px',padding:'6px 11px',fontSize:'11px',fontWeight:900,textTransform:'capitalize'}}>{labelizeStatus(selected.status)}</span>
                    {selectedQuoteId ? <Link href={filterHref({})} style={{border:'1px solid #e2e8f0',background:'white',borderRadius:'999px',padding:'6px 11px',fontSize:'11px',fontWeight:850,color:'#475569',textDecoration:'none'}}>Close focus</Link> : null}
                  </div>
                </div>

                <div style={{marginTop:'16px',display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:'10px'}}>
                  {[
                    ['Total', formatQuoteMoney(selected.subtotal, selected.currency)],
                    ['Line items', String(selected.lineItems.length)],
                    ['Version', `v${selected.totalVersions || 1}`],
                    ['Validity', getValidityLabel(selected).label],
                  ].map(([label,value]) => (
                    <div key={label} style={{border:'1px solid #e2e8f0',borderRadius:'16px',background:'white',padding:'11px 12px'}}>
                      <div style={{fontSize:'9px',fontWeight:900,letterSpacing:'.14em',textTransform:'uppercase',color:'#94a3b8'}}>{label}</div>
                      <div style={{marginTop:'4px',fontSize:'14px',fontWeight:900,color:'#0f172a'}}>{value}</div>
                    </div>
                  ))}
                </div>

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
                      )) : <div style={{fontSize:'12px',color:'#64748b'}}>No quote lines are attached yet.</div>}
                      {selected.lineItems.length > selectedProducts.length ? <div style={{fontSize:'11px',fontWeight:800,color:'#64748b'}}>+ {selected.lineItems.length - selectedProducts.length} more lines in quote detail</div> : null}
                    </div>
                  </div>
                  <div style={{border:'1px solid #e2e8f0',borderRadius:'18px',background:'white',padding:'14px'}}>
                    <div style={{fontSize:'10px',fontWeight:900,letterSpacing:'.14em',textTransform:'uppercase',color:'#94a3b8'}}>Recent history</div>
                    {selectedHistory.length ? <div style={{marginTop:'8px',maxHeight:'150px',overflow:'auto'}}><QuoteHistoryList items={selectedHistory.slice(0,4)} /></div> : <p style={{fontSize:'12px',color:'#64748b'}}>No visible history yet.</p>}
                  </div>
                </div>
              </div>

              <aside style={{border:'1px solid #dbe4ef',borderRadius:'22px',background:selectedIsAccepted ? '#ecfdf5' : selectedIsPending ? '#fffbeb' : '#ffffff',padding:'16px',display:'grid',gap:'12px',alignContent:'start'}}>
                <div>
                  <div style={{fontSize:'10px',fontWeight:900,letterSpacing:'.14em',textTransform:'uppercase',color:selectedIsAccepted ? '#047857' : selectedIsPending ? '#92400e' : '#64748b'}}>Next best action</div>
                  <h3 style={{margin:'6px 0 0',fontSize:'20px',fontWeight:950,color:'#0f172a'}}>
                    {selectedIsAccepted ? 'Order handoff ready' : selectedIsPending ? 'Approval required' : selectedIsSent ? 'Customer follow-up' : selectedIsDraftLike ? 'Continue quote' : 'Review quote'}
                  </h3>
                  <p style={{margin:'6px 0 0',fontSize:'12px',lineHeight:1.6,color:'#64748b'}}>
                    {selectedIsAccepted ? 'This quote is accepted. Keep order creation as the primary action and use PDF/send history only as supporting context.' : selectedIsPending ? 'Review quote-only adjustments before the quote can be sent.' : selectedIsSent ? 'The quote is customer-facing. Track response or move into accepted handoff when the buyer confirms.' : selectedIsDraftLike ? 'Finish the quote structure, pricing, and readiness before customer send.' : 'Use the focused actions below before moving to the next quote.'}
                  </p>
                </div>

                {selectedIsAccepted ? (
                  <form action={createOrderHandoffAction} style={{display:'grid',gap:'8px'}}>
                    <input type="hidden" name="quote_id" value={selected.id}/>
                    <input type="hidden" name="notes" value="Order handoff created from Quotes workspace."/>
                    <button type="submit" style={{border:0,textAlign:'center',padding:'12px 14px',borderRadius:'14px',background:'#059669',color:'white',fontWeight:950}}>Create order handoff</button>
                    <Link href={selectedOrderHref} style={{textAlign:'center',padding:'10px 12px',borderRadius:'14px',border:'1px solid #a7f3d0',background:'white',color:'#047857',fontWeight:900,textDecoration:'none'}}>Open order workspace</Link>
                  </form>
                ) : selectedIsPending ? (
                  <div style={{display:'grid',gap:'8px'}}>
                    <form action={approveSelectedQuoteAction} style={{display:'grid',gap:'8px'}}>
                      <input type="hidden" name="quote_id" value={selected.id}/><input type="hidden" name="lead_id" value={selected.leadId}/>
                      <button type="submit" style={{border:0,borderRadius:'14px',background:'#059669',color:'white',fontWeight:950,padding:'12px 14px'}}>Approve quote adjustment</button>
                    </form>
                    <form action={rejectSelectedQuoteAction} style={{display:'grid',gap:'8px'}}>
                      <input type="hidden" name="quote_id" value={selected.id}/><input type="hidden" name="lead_id" value={selected.leadId}/>
                      <textarea name="rejection_reason" required placeholder="Rejection reason required" rows={3} style={{border:'1px solid #fecaca',borderRadius:'12px',padding:'10px',fontSize:'12px'}} />
                      <button type="submit" style={{border:'1px solid #fecaca',borderRadius:'14px',background:'white',color:'#dc2626',fontWeight:900,padding:'10px 12px'}}>Reject / request revision</button>
                    </form>
                  </div>
                ) : (
                  <div style={{display:'grid',gap:'8px'}}>
                    <Link href={selectedIsSent ? selectedSendHref : buildLeadQuoteHref(selected.leadId,selected.id,selectedMode,{handoff:'quote-revise'})} style={{textAlign:'center',padding:'12px 14px',borderRadius:'14px',background:'#0b2e4a',color:'white',fontWeight:950,textDecoration:'none'}}>{selectedIsSent ? 'Open send / response workflow' : 'Continue quote'}</Link>
                    <Link href={selectedApprovalHref} style={{textAlign:'center',padding:'10px 12px',borderRadius:'14px',border:'1px solid #dbe4ef',background:'white',color:'#334155',fontWeight:900,textDecoration:'none'}}>Review readiness</Link>
                  </div>
                )}

                <div style={{display:'grid',gap:'8px',borderTop:'1px solid rgba(15,23,42,.08)',paddingTop:'10px'}}>
                  <Link href={`/api/quotes/${selected.id}/pdf`} target="_blank" style={{textAlign:'center',padding:'10px 12px',borderRadius:'14px',border:'1px solid #dbe4ef',background:'white',color:'#334155',fontWeight:900,textDecoration:'none'}}>Open customer PDF</Link>
                  {!selectedIsAccepted ? <Link href={selectedSendHref} style={{textAlign:'center',padding:'10px 12px',borderRadius:'14px',border:'1px solid #dbe4ef',background:'white',color:'#334155',fontWeight:900,textDecoration:'none'}}>Send by email / WhatsApp</Link> : null}
                  <Link href={buildLeadQuoteHref(selected.leadId,selected.id,selectedMode,{handoff:'quote-revise'})} style={{textAlign:'center',padding:'10px 12px',borderRadius:'14px',border:'1px solid #dbe4ef',background:'white',color:'#334155',fontWeight:900,textDecoration:'none'}}>Edit / revise quote</Link>
                </div>
              </aside>
            </div>
          </section>
        ) : null}

        <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'10px'}}>
          {[
            {label:'Pending approval',value:approvalQueueCount,meta:'Waiting for review',accent:'#d97706'},
            {label:'Expiring soon',value:expiringSoonCount,meta:'Within 3 days',accent:'#dc2626'},
            {label:'Sent & active',value:sentActiveCount,meta:'Awaiting response',accent:'#0c7fff'},
            {label:'Accepted',value:acceptedCount,meta:'Order ready',accent:'#059669'},
            {label:'Drafts',value:draftCount,meta:'Not yet sent',accent:'#cbd5e1'},
            {label:'Total value',value:formatQuoteMoney(totalValue,'USD'),meta:'All active quotes',accent:'#7c3aed'},
          ].map(sc => (
            <div key={sc.label} className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{background:sc.accent}}/>
              <div className="text-[9px] font-extrabold uppercase tracking-[.14em] text-slate-400 mb-1">{sc.label}</div>
              <div className="text-[18px] font-black tracking-tight text-slate-900 leading-none">{sc.value}</div>
              <div className="text-[10px] text-slate-400 mt-1 font-semibold">{sc.meta}</div>
            </div>
          ))}
        </div>

        {approvalQueueCount>0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div style={{fontSize:'12px',fontWeight:800,color:'#92400e',marginBottom:'4px'}}>{approvalQueueCount} quote{approvalQueueCount>1?'s':''} pending approval</div>
            <div style={{fontSize:'11px',color:'#92400e',lineHeight:'1.55'}}>Review overrides, approve or reject, and keep the send gate blocked until approval is logged.</div>
            <div style={{display:'flex',gap:'8px',marginTop:'10px'}}>
              {firstApproval && <Link href={`/quotes?quoteId=${firstApproval.id}`} style={{padding:'7px 16px',borderRadius:'6px',background:'#059669',color:'white',fontSize:'12px',fontWeight:700,textDecoration:'none'}}>Review {firstApproval.quoteNumber??firstApproval.id.slice(0,8)}</Link>}
              {secondApproval && <Link href={`/quotes?quoteId=${secondApproval.id}`} style={{padding:'7px 14px',borderRadius:'6px',background:'white',border:'1px solid #e2e8f0',color:'#334155',fontSize:'12px',fontWeight:600,textDecoration:'none'}}>Review {secondApproval.quoteNumber??secondApproval.id.slice(0,8)}</Link>}
            </div>
          </div>
        )}

        <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:'22px',overflow:'hidden',boxShadow:'0 1px 3px rgba(15,23,42,.06)'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div><div style={{fontSize:'9px',fontWeight:900,letterSpacing:'.18em',textTransform:'uppercase',color:'#64748b',marginBottom:'2px'}}>Secondary quote queue</div><div style={{fontSize:'14px',fontWeight:850,color:'#0f172a'}}>{filteredItems.length} matching quotes</div></div>
            <span style={{fontSize:'11px',fontWeight:800,color:'#64748b'}}>Select one quote to move focus above</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'30px 1fr 120px 100px 110px 110px 90px 90px',gap:'8px',padding:'9px 18px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0',fontSize:'9px',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'#94a3b8'}}>
            <div/><div>Company / ref</div><div>Status</div><div>Version</div><div style={{textAlign:'right'}}>Total value</div><div>Validity</div><div>Owner</div><div style={{textAlign:'right'}}>Action</div>
          </div>
          <div style={{maxHeight:'520px',overflowY:'auto'}}>
            {filteredItems.length===0 ? (
              <div style={{padding:'32px',textAlign:'center',fontSize:'13px',color:'#64748b'}}><strong>No quotes match the active filters.</strong><br/>{activeQuoteFilterChips.length ? activeQuoteFilterChips.map((chip) => chip.label).join(' · ') : 'No active filters'}<br/><Link href="/quotes" style={{display:'inline-block',marginTop:'12px',padding:'7px 14px',borderRadius:'999px',background:'#0b2e4a',color:'white',fontSize:'11px',fontWeight:800,textDecoration:'none'}}>Clear filters</Link></div>
            ) : queueItems.map(item => {
              const validity = getValidityLabel(item);
              const isPending = item.status==='pending_approval';
              const isExpiring = validity.rose && item.status!=='expired';
              const isAccepted = item.status==='accepted'||item.hasAcceptedContract;
              const isSelected = selected?.id===item.id;
              const borderLeft = isSelected ? '4px solid #0c7fff' : isPending?'3px solid #d97706':isExpiring?'3px solid #dc2626':undefined;
              const actionLabel = getQuoteActionLabel(item);
              const actionPrimary = isPending||isAccepted||item.status==='approved';
              const sc = getStatusStyle(item.status);
              return (
                <Link key={item.id} href={`/quotes?quoteId=${item.id}&mode=${encodeURIComponent(filters.mode)}&q=${encodeURIComponent(filters.q)}&status=${encodeURIComponent(filters.status)}`}
                  style={{display:'grid',gridTemplateColumns:'30px 1fr 120px 100px 110px 110px 90px 90px',gap:'8px',padding:'12px 18px',borderBottom:'1px solid #e2e8f0',alignItems:'center',cursor:'pointer',textDecoration:'none',background:isSelected?'rgba(12,127,255,.065)':isAccepted?'rgba(5,150,105,.02)':'white',borderLeft,transition:'background .1s'}}>
                  <div><input type="checkbox" style={{width:'16px',height:'16px',borderRadius:'3px'}} readOnly checked={false}/></div>
                  <div>
                    <div style={{fontSize:'12px',fontWeight:800,color:'#1e293b',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.companyName}</div>
                    <div style={{fontSize:'10px',color:'#94a3b8',fontFamily:'monospace',marginTop:'1px'}}>{item.quoteNumber??item.id.slice(0,8)} · {item.lineItems[0]?.productName??'No product'}{item.lineItems.length>1?` + ${item.lineItems.length-1}`:''}</div>
                  </div>
                  <div><span style={{display:'inline-flex',alignItems:'center',padding:'2px 8px',borderRadius:'999px',fontSize:'9px',fontWeight:700,border:'1px solid',background:sc.bg,borderColor:sc.border,color:sc.color,whiteSpace:'nowrap'}}>{labelizeStatus(item.status)}</span></div>
                  <div style={{fontSize:'11px',fontWeight:600,color:'#334155'}}>v{item.totalVersions||1}</div>
                  <div style={{textAlign:'right'}}><div style={{fontSize:'12px',fontWeight:800,color:'#1e293b'}}>{formatQuoteMoney(item.subtotal,item.currency)}</div><div style={{fontSize:'10px',color:'#94a3b8'}}>{item.currency??'USD'} · Quote</div></div>
                  <div style={{fontSize:'11px',fontWeight:validity.rose||validity.amber?700:400,color:validity.rose?'#dc2626':validity.amber?'#d97706':validity.emerald?'#059669':'#64748b'}}>{validity.label}</div>
                  <div style={{fontSize:'11px',color:'#475569'}}>{item.contactName??'--'}</div>
                  <div style={{textAlign:'right'}}><span style={{padding:'4px 10px',borderRadius:'6px',border:'1px solid',fontSize:'10px',fontWeight:700,background:actionPrimary?'#0b2e4a':'white',borderColor:actionPrimary?'#0b2e4a':'#e2e8f0',color:actionPrimary?'white':'#475569'}}>{actionLabel}</span></div>
                </Link>
              );
            })}
          </div>
          {filteredItems.length>queueItems.length&&<div style={{textAlign:'center',padding:'12px',color:'#94a3b8',fontSize:'12px',fontWeight:700}}>Showing first {queueItems.length} matching quotes in the secondary queue. Refine filters to narrow the list.</div>}
        </div>
      </div>
    </div>
  );
}
