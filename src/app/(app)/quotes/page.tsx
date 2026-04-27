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

const FILTER_STATUSES = ['all','draft','internal_review','pending_approval','approved','sent','revised','accepted','rejected','expired'];
const FILTER_MODES = ['all','buyers','suppliers'];

type QuoteWorkspaceItem = ReturnType<typeof buildQuotesPageViewModel>['items'][number];

function readSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}
function labelizeStatus(value: string) { return value.replaceAll('_', ' '); }
function readIsoDate(value: string) {
  const trimmed = value.trim(); if (!trimmed) return null;
  const parsed = Date.parse(`${trimmed}T00:00:00.000Z`);
  return Number.isFinite(parsed) ? parsed : null;
}
function getQuoteActionLabel(item: QuoteWorkspaceItem) {
  if (item.status === 'pending_approval') return 'Review';
  if (item.status === 'approved') return 'Send';
  if (item.status === 'accepted' || item.hasAcceptedContract) return 'Create order';
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
  const daysLeft = Math.max(0, 30 - daysSinceUpdate);
  if (daysLeft <= 3) return { label: `${daysLeft} days left!`, rose: true, amber: false, emerald: false };
  if (daysLeft <= 7) return { label: `${daysLeft} days left`, rose: false, amber: true, emerald: false };
  return { label: `${daysLeft} days left`, rose: false, amber: false, emerald: false };
}
function filterItems(items: ReturnType<typeof buildQuotesPageViewModel>['items'], f: {q:string;status:string;company:string;from:string;to:string;mode:string}) {
  const q = f.q.trim().toLowerCase(); const company = f.company.trim().toLowerCase();
  const from = readIsoDate(f.from); const to = readIsoDate(f.to);
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

export default async function QuotesPage({ searchParams }: { searchParams?: { quoteId?: string|string[]; q?: string|string[]; status?: string|string[]; company?: string|string[]; from?: string|string[]; to?: string|string[]; mode?: string|string[] } }) {
  let workspace: Awaited<ReturnType<typeof getWorkspaceAccess>>|null = null;
  try { workspace = await getWorkspaceAccess(); } catch { return <EmptyState title="Workspace unavailable" description="Could not load workspace." />; }
  if (!hasSupabaseEnv || workspace?.missingEnv) return <EmptyState title="Configuration required" description="SETU Flow needs Supabase environment values." />;
  if (!workspace?.organization) return <EmptyState title="Workspace membership needed" description="No active organization membership." />;

  const supabase = await createClient(); const db = supabase as any;
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

  const quotesResult = await db.from('quotes').select('id, lead_id, status, currency, notes, quote_number, created_at, updated_at, current_version_id').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(200);
  if (quotesResult.error) return <EmptyState title="Could not load quotes" description={String(quotesResult.error.message ?? 'Unknown error')} />;
  const quotes = Array.isArray(quotesResult.data) ? quotesResult.data : [];

  if (!quotes.length) {
    return (
      <div style={{padding:'24px',background:'#f0f4f8',minHeight:'100vh'}}>
        <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:'22px',padding:'32px',textAlign:'center'}}>
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
    db.from('quote_versions').select('id, quote_id, version_no, status, created_at, approved_at, sent_at, quote_pricing_snapshots(fx_rate, fx_display_currency)').in('quote_id', quoteIds).order('created_at', {ascending: false}),
    db.from('quote_negotiation_events').select('id, quote_id, event_type, message, created_at, actor_name').in('quote_id', quoteIds).order('created_at', {ascending: false}),
    db.from('communications').select('id, quote_id, subject, summary, status, created_at').in('quote_id', quoteIds).order('created_at', {ascending: false}),
    db.from('contracts').select('id, quote_id, status, signed_at, starts_on, commercial_lock_state, commercial_snapshot').eq('organization_id', organizationId).in('quote_id', quoteIds),
    db.from('quote_line_items').select('id, quote_id, product_id, quantity, unit_price, currency, catalog_price_amount, catalog_price_currency, is_price_overridden, override_reason, notes').in('quote_id', quoteIds),
  ]);

  const lineItems = Array.isArray(lineItemsResult.data) ? lineItemsResult.data : [];
  const productIds = [...new Set(lineItems.map((l: any) => l.product_id).filter(Boolean))];
  const productsResult = productIds.length ? await db.from('products').select('id, name, sku').eq('organization_id', organizationId).in('id', productIds) : { data: [], error: null };

  const baseViewModelInput = {
    quotes, leads: Array.isArray(leadsResult.data) ? leadsResult.data : [],
    versions: Array.isArray(versionsResult.data) ? versionsResult.data : [],
    negotiations: Array.isArray(negotiationsResult.data) ? negotiationsResult.data : [],
    communications: Array.isArray(communicationsResult.data) ? communicationsResult.data : [],
    contracts: Array.isArray(contractsResult.data) ? contractsResult.data : [],
    lineItems, products: Array.isArray(productsResult.data) ? productsResult.data : [],
  };

  const viewModel = buildQuotesPageViewModel({ ...baseViewModelInput, selectedQuoteId });
  const filteredItems = filterItems(viewModel.items, filters);
  const selected = (selectedQuoteId ? viewModel.items.find(i => i.id === selectedQuoteId) : null) ?? filteredItems[0] ?? viewModel.selectedItem;
  const selectedMode = selected?.leadType === 'buyer' ? 'buyers' : selected?.leadType === 'supplier' ? 'suppliers' : null;
  const selectedApprovalHref = selected ? buildApprovalSendHref({queue:'approvals',quoteId:selected.id,leadId:selected.leadId,handoff:'quote-approval-status'}, selectedMode) : PRODUCT_ROUTES.app.integrations;
  const selectedOrderHref = selected ? buildOrdersHref({notice:'quote-accepted',quoteId:selected.id,leadId:selected.leadId,handoff:'quote-to-orders'}, selectedMode) : PRODUCT_ROUTES.app.orders;
  const selectedHistory = selected ? (selected.id === viewModel.selectedItem?.id ? viewModel.selectedHistory : buildQuotesPageViewModel({...baseViewModelInput, selectedQuoteId:selected.id}).selectedHistory) : [];

  const approvalQueue = viewModel.items.filter(i => i.status === 'pending_approval');
  const approvalQueueCount = approvalQueue.length;
  const expiringSoonCount = viewModel.items.filter(i => { const v = getValidityLabel(i); return v.rose && i.status !== 'expired'; }).length;
  const sentActiveCount = viewModel.items.filter(i => ['sent','approved','negotiating'].includes(i.status)).length;
  const draftCount = viewModel.items.filter(i => ['draft','internal_review','revised'].includes(i.status)).length;
  const acceptedCount = viewModel.items.filter(i => i.status === 'accepted' || i.hasAcceptedContract).length;
  const totalValue = viewModel.items.reduce((s, i) => s + i.subtotal, 0);
  const firstApproval = approvalQueue[0]; const secondApproval = approvalQueue[1];

  const ss = (px: React.CSSProperties) => px;

  return (
    <div style={{fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif',fontSize:'13px',lineHeight:'1.5',color:'#1e293b',background:'#f0f4f8',minHeight:'100vh'}}>

      {/* ── TOPBAR ─────────────────────────────────────── */}
      <header style={{background:'white',borderBottom:'1px solid #e2e8f0',padding:'0 24px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:50}}>
        <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'5px 12px',borderRadius:'6px',background:'rgba(11,46,74,.06)',border:'1px solid rgba(11,46,74,.12)'}}>
            <div><div style={{fontSize:'11px',fontWeight:800,color:'#1F487C',letterSpacing:'-.1px'}}>SETU <span style={{color:'#279491'}}>Flow</span> CRM</div><div style={{fontSize:'8px',color:'#94a3b8',letterSpacing:'.1em',textTransform:'uppercase'}}>SETU Groups LLC</div></div>
          </div>
          <div style={{width:'1px',height:'24px',background:'#e2e8f0'}}/>
          <div><div style={{fontSize:'10px',fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'#0c7fff'}}>Commercial</div><div style={{fontSize:'16px',fontWeight:700,color:'#1e293b',letterSpacing:'-.3px'}}>Quotes Workspace</div></div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <div style={{display:'flex',background:'#f1f5f9',borderRadius:'6px',padding:'3px',border:'1px solid #e2e8f0',gap:'2px'}}>
            {FILTER_MODES.map(m => (
              <Link key={m} href={`/quotes?mode=${m}&status=${encodeURIComponent(filters.status)}&q=${encodeURIComponent(filters.q)}`} style={{padding:'4px 11px',borderRadius:'5px',fontSize:'11px',fontWeight:600,textDecoration:'none',background:filters.mode===m?'#0b2e4a':'transparent',color:filters.mode===m?'white':'#64748b'}}>{m.charAt(0).toUpperCase()+m.slice(1)}</Link>
            ))}
          </div>
          <Link href="/quotes?export=csv" style={{padding:'7px 12px',borderRadius:'6px',border:'1px solid #e2e8f0',background:'white',fontSize:'12px',fontWeight:600,color:'#334155',textDecoration:'none'}}>Export</Link>
          <Link href={PRODUCT_ROUTES.app.leads} style={{padding:'7px 14px',borderRadius:'6px',background:'#0b2e4a',color:'white',fontSize:'12px',fontWeight:700,textDecoration:'none'}}>+ New quote</Link>
        </div>
      </header>

      {/* ── FILTER BAR ─────────────────────────────────── */}
      <form action="/quotes" style={{background:'white',borderBottom:'1px solid #e2e8f0',padding:'10px 24px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
        <input type="hidden" name="mode" value={filters.mode}/>
        <div style={{display:'flex',alignItems:'center',gap:'6px',padding:'6px 10px',border:'1px solid #e2e8f0',borderRadius:'6px',background:'white',height:'32px',minWidth:'200px'}}>
          <input name="q" defaultValue={filters.q} placeholder="Search company, quote ref, product..." style={{border:'none',outline:'none',fontSize:'11px',color:'#1e293b',background:'transparent',width:'100%'}}/>
        </div>
        <select name="status" defaultValue={filters.status} style={{appearance:'none',border:'1px solid #e2e8f0',borderRadius:'6px',background:'#f8fafc',padding:'0 12px',height:'32px',fontSize:'11px',fontWeight:600,color:'#1e293b',cursor:'pointer',minWidth:'130px'}}>
          {FILTER_STATUSES.map(s => <option key={s} value={s}>{s==='all'?'All statuses':labelizeStatus(s)}</option>)}
        </select>
        {/* Quick-filter chips */}
        {approvalQueueCount>0 && <span style={{display:'inline-flex',alignItems:'center',gap:'5px',padding:'3px 10px',borderRadius:'999px',fontSize:'10px',fontWeight:700,background:'#fffbeb',border:'1px solid #fde68a',color:'#92400e',cursor:'pointer'}}>Pending approval ({approvalQueueCount})</span>}
        {expiringSoonCount>0 && <span style={{display:'inline-flex',alignItems:'center',gap:'5px',padding:'3px 10px',borderRadius:'999px',fontSize:'10px',fontWeight:700,background:'#fff1f2',border:'1px solid #fecaca',color:'#9f1239',cursor:'pointer'}}>Expiring ({expiringSoonCount})</span>}
        <button type="submit" style={{padding:'0 12px',height:'32px',borderRadius:'6px',background:'#0b2e4a',color:'white',fontSize:'11px',fontWeight:700,border:'none',cursor:'pointer'}}>Apply</button>
        <span style={{marginLeft:'auto',fontSize:'10px',fontWeight:600,color:'#94a3b8'}}>{filteredItems.length} quotes · {formatQuoteMoney(totalValue,'USD')} total value</span>
      </form>

      {/* ── STATS STRIP ────────────────────────────────── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'10px',padding:'16px 24px 0'}}>
        {[
          {label:'Pending approval',value:approvalQueueCount,meta:'Waiting for review',accent:'#d97706'},
          {label:'Expiring soon',value:expiringSoonCount,meta:'Within 3 days',accent:'#dc2626'},
          {label:'Sent & active',value:sentActiveCount,meta:'Awaiting buyer response',accent:'#0c7fff'},
          {label:'Accepted',value:acceptedCount,meta:'Order creation available',accent:'#059669'},
          {label:'Drafts',value:draftCount,meta:'Not yet sent',accent:'#cbd5e1'},
          {label:'Total value',value:formatQuoteMoney(totalValue,'USD'),meta:'All active quotes',accent:'#7c3aed'},
        ].map(sc => (
          <div key={sc.label} style={{position:'relative',overflow:'hidden',borderRadius:'16px',border:'1px solid #e2e8f0',background:'white',padding:'13px 15px',boxShadow:'0 1px 3px rgba(15,23,42,.06)',cursor:'pointer'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:'3px',background:sc.accent,borderRadius:'16px 16px 0 0'}}/>
            <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'.14em',textTransform:'uppercase',color:'#94a3b8',marginBottom:'7px'}}>{sc.label}</div>
            <div style={{fontSize:'22px',fontWeight:800,letterSpacing:'-.03em',color:'#0f172a',lineHeight:1}}>{sc.value}</div>
            <div style={{fontSize:'10px',color:'#94a3b8',marginTop:'4px',fontWeight:600}}>{sc.meta}</div>
          </div>
        ))}
      </div>

      {/* ── CONTENT ────────────────────────────────────── */}
      <div style={{padding:'14px 24px 40px',display:'flex',flexDirection:'column',gap:'14px'}}>

        {/* Approval banner */}
        {approvalQueueCount>0 && (
          <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:'12px',padding:'12px 16px'}}>
            <div style={{fontSize:'12px',fontWeight:800,color:'#92400e',marginBottom:'4px'}}>{approvalQueueCount} quote{approvalQueueCount>1?'s':''} pending your approval — pricing override review required</div>
            <div style={{fontSize:'11px',color:'#92400e',lineHeight:'1.55'}}>Review overrides, approve or reject, and keep the send gate blocked until approval is logged.</div>
            <div style={{display:'flex',gap:'8px',marginTop:'10px'}}>
              {firstApproval && <Link href={`/quotes?quoteId=${firstApproval.id}`} style={{padding:'7px 16px',borderRadius:'6px',background:'#059669',color:'white',fontSize:'12px',fontWeight:700,textDecoration:'none'}}>Review {firstApproval.quoteNumber??firstApproval.id.slice(0,8)} ({firstApproval.companyName})</Link>}
              {secondApproval && <Link href={`/quotes?quoteId=${secondApproval.id}`} style={{padding:'7px 14px',borderRadius:'6px',background:'white',border:'1px solid #e2e8f0',color:'#334155',fontSize:'12px',fontWeight:600,textDecoration:'none'}}>Review {secondApproval.quoteNumber??secondApproval.id.slice(0,8)} ({secondApproval.companyName})</Link>}
            </div>
          </div>
        )}

        {/* Quotes table card */}
        <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:'22px',overflow:'hidden',boxShadow:'0 1px 3px rgba(15,23,42,.06)'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div><div style={{fontSize:'9px',fontWeight:700,letterSpacing:'.18em',textTransform:'uppercase',color:'#0c7fff',marginBottom:'2px'}}>Quote workspace</div><div style={{fontSize:'14px',fontWeight:700,color:'#0f172a'}}>All quotes</div></div>
            <Link href="/quotes?bulk=1" style={{padding:'4px 10px',borderRadius:'6px',border:'1px solid #e2e8f0',background:'white',fontSize:'11px',fontWeight:700,color:'#475569',textDecoration:'none'}}>Bulk action</Link>
          </div>
          {/* Header */}
          <div style={{display:'grid',gridTemplateColumns:'30px 1fr 120px 100px 110px 110px 90px 90px',gap:'8px',padding:'9px 18px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0',fontSize:'9px',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'#94a3b8'}}>
            <div/><div>Company / ref</div><div>Status</div><div>Version</div><div style={{textAlign:'right'}}>Total value</div><div>Validity</div><div>Owner</div><div style={{textAlign:'right'}}>Action</div>
          </div>
          {/* Rows */}
          {filteredItems.length===0 ? (
            <div style={{padding:'32px',textAlign:'center',fontSize:'13px',color:'#64748b'}}>No quotes match these filters.</div>
          ) : filteredItems.map(item => {
            const validity = getValidityLabel(item);
            const isPending = item.status==='pending_approval';
            const isExpiring = validity.rose && item.status!=='expired';
            const isAccepted = item.status==='accepted'||item.hasAcceptedContract;
            const isSelected = selected?.id===item.id;
            const borderLeft = isPending?'3px solid #d97706':isExpiring?'3px solid #dc2626':undefined;
            const actionLabel = getQuoteActionLabel(item);
            const actionPrimary = isPending||isAccepted||item.status==='approved';
            const statusColors: Record<string,{bg:string,border:string,color:string}> = {
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
            const sc = statusColors[item.status]??statusColors.draft;
            return (
              <Link key={item.id} href={`/quotes?quoteId=${item.id}&mode=${encodeURIComponent(filters.mode)}&q=${encodeURIComponent(filters.q)}&status=${encodeURIComponent(filters.status)}`}
                style={{display:'grid',gridTemplateColumns:'30px 1fr 120px 100px 110px 110px 90px 90px',gap:'8px',padding:'12px 18px',borderBottom:'1px solid #e2e8f0',alignItems:'center',cursor:'pointer',textDecoration:'none',background:isSelected?'rgba(12,127,255,.04)':isAccepted?'rgba(5,150,105,.02)':'white',borderLeft,transition:'background .1s'}}>
                <div><input type="checkbox" style={{width:'16px',height:'16px',borderRadius:'3px'}} onClick={e=>e.stopPropagation()} onChange={()=>{}} checked={false}/></div>
                <div>
                  <div style={{fontSize:'12px',fontWeight:700,color:'#1e293b',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.companyName}</div>
                  <div style={{fontSize:'10px',color:'#94a3b8',fontFamily:'monospace',marginTop:'1px'}}>{item.quoteNumber??item.id.slice(0,8)} · {item.lineItems[0]?.productName??'No product'}{item.lineItems.length>1?` + ${item.lineItems.length-1}`:''}</div>
                  <div style={{display:'flex',alignItems:'center',gap:'4px',flexWrap:'wrap',marginTop:'4px'}}>
                    {Array.from({length:Math.min(item.totalVersions||1,3)},(_,idx)=>item.totalVersions-idx).map((v,idx)=>(
                      <span key={v} style={{fontSize:'9px',fontWeight:700,padding:'2px 8px',borderRadius:'999px',background:idx===0?(isAccepted?'#ecfdf5':'#0c7fff'):undefined,border:idx===0?'1px solid '+(isAccepted?'#a7f3d0':'#0c7fff'):'1px solid #e2e8f0',color:idx===0?(isAccepted?'#059669':'white'):'#475569'}}>{`v${v}${idx===0?' current':''}`}</span>
                    ))}
                  </div>
                </div>
                <div><span style={{display:'inline-flex',alignItems:'center',padding:'2px 8px',borderRadius:'999px',fontSize:'9px',fontWeight:700,border:'1px solid',background:sc.bg,borderColor:sc.border,color:sc.color,whiteSpace:'nowrap'}}>{labelizeStatus(item.status)}</span></div>
                <div style={{fontSize:'11px',fontWeight:600,color:'#334155'}}>v{item.totalVersions||1}</div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:'12px',fontWeight:800,color:'#1e293b'}}>{formatQuoteMoney(item.subtotal,item.currency)}</div>
                  <div style={{fontSize:'10px',color:'#94a3b8'}}>{item.currency??'USD'} · Quote</div>
                </div>
                <div style={{fontSize:'11px',fontWeight:validity.rose||validity.amber?700:400,color:validity.rose?'#dc2626':validity.amber?'#d97706':validity.emerald?'#059669':'#64748b'}}>{validity.label}</div>
                <div style={{fontSize:'11px',color:'#475569'}}>{item.contactName??'—'}</div>
                <div style={{textAlign:'right'}}>
                  <span style={{padding:'4px 10px',borderRadius:'6px',border:'1px solid',fontSize:'10px',fontWeight:700,background:actionPrimary?'#0b2e4a':'white',borderColor:actionPrimary?'#0b2e4a':'#e2e8f0',color:actionPrimary?'white':'#475569'}}>{actionLabel}</span>
                </div>
              </Link>
            );
          })}
          {filteredItems.length>0&&<div style={{textAlign:'center',padding:'14px',color:'#94a3b8',fontSize:'12px',fontWeight:600}}>+ {Math.max(0,viewModel.items.length-filteredItems.length)} more quotes · <span style={{color:'#0c7fff',cursor:'pointer'}}>Load all</span></div>}
        </div>

        {/* Selected detail panel */}
        {selected&&(
          <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:'22px',overflow:'hidden',boxShadow:'0 1px 3px rgba(15,23,42,.06)'}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'12px'}}>
              <div>
                <div style={{fontSize:'17px',fontWeight:800,color:'#0f172a',marginBottom:'3px'}}>{selected.companyName}</div>
                <div style={{fontSize:'11px',color:'#64748b'}}>{selected.quoteNumber??selected.id.slice(0,8)} · v{selected.totalVersions||1} · {labelizeStatus(selected.status)}</div>
              </div>
              <div style={{display:'flex',gap:'8px'}}>
                <Link href={buildLeadQuoteHref(selected.leadId,selected.id,selectedMode,{handoff:'quote-revise'})} style={{padding:'9px 14px',borderRadius:'6px',background:'white',border:'1px solid #e2e8f0',fontSize:'12px',fontWeight:600,color:'#475569',textDecoration:'none'}}>Edit quote</Link>
                <Link href="/quotes?export=pdf" style={{padding:'9px 14px',borderRadius:'6px',background:'white',border:'1px solid #e2e8f0',fontSize:'12px',fontWeight:600,color:'#475569',textDecoration:'none'}}>Export PDF</Link>
                <Link href={selected.status==='accepted'||selected.hasAcceptedContract?selectedOrderHref:selectedApprovalHref} style={{flex:1,padding:'9px 16px',borderRadius:'6px',background:'#0b2e4a',color:'white',border:'none',fontSize:'12px',fontWeight:700,textDecoration:'none'}}>
                  {selected.status==='accepted'||selected.hasAcceptedContract?'Create order':selected.status==='pending_approval'?'Approve & allow send':'Open lead'}
                </Link>
              </div>
            </div>
            <div style={{padding:'16px 20px',display:'flex',flexDirection:'column',gap:'12px'}}>
              {/* Approval alert */}
              {(selected.status==='pending_approval'||selected.hasPriceOverride)&&(
                <div style={{padding:'12px 14px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:'12px'}}>
                  <div style={{fontSize:'12px',fontWeight:800,color:'#92400e',marginBottom:'4px'}}>Approval required — pricing override</div>
                  <div style={{fontSize:'11px',color:'#92400e',marginBottom:'10px'}}>One or more lines have manually overridden pricing. Approve or reject before sending.</div>
                  <div style={{display:'flex',gap:'8px'}}>
                    <Link href={selectedApprovalHref} style={{padding:'7px 16px',borderRadius:'6px',background:'#059669',color:'white',fontSize:'12px',fontWeight:700,textDecoration:'none',flex:1,textAlign:'center'}}>Approve & allow send</Link>
                    <Link href={selectedApprovalHref} style={{padding:'7px 14px',borderRadius:'6px',background:'white',border:'1px solid #fecaca',color:'#dc2626',fontSize:'12px',fontWeight:700,textDecoration:'none'}}>Reject override</Link>
                  </div>
                </div>
              )}
              {/* Details */}
              <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'12px',padding:'12px 14px'}}>
                <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'#94a3b8',marginBottom:'8px'}}>Quote details</div>
                {[['Company',selected.companyName],['Contact',selected.contactName??'Not set'],['Currency',selected.currency??'USD'],['Subtotal',formatQuoteMoney(selected.subtotal,selected.currency)]].map(([k,v])=>(
                  <div key={k as string} style={{display:'flex',justifyContent:'space-between',fontSize:'12px',padding:'3px 0',borderBottom:'1px solid rgba(0,0,0,.03)'}}>
                    <span style={{color:'#64748b'}}>{k}</span><span style={{fontWeight:700,color:'#1e293b'}}>{v}</span>
                  </div>
                ))}
              </div>
              {/* Line items */}
              {selected.lineItems.length>0&&(
                <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'12px',padding:'12px 14px'}}>
                  <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'#94a3b8',marginBottom:'8px'}}>Line items</div>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
                    <thead><tr style={{background:'#f8fafc'}}>
                      <th style={{textAlign:'left',padding:'5px 8px',fontSize:'9px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'#94a3b8',borderBottom:'1px solid #e2e8f0'}}>Product</th>
                      <th style={{textAlign:'right',padding:'5px 8px',fontSize:'9px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'#94a3b8',borderBottom:'1px solid #e2e8f0'}}>Catalog</th>
                      <th style={{textAlign:'right',padding:'5px 8px',fontSize:'9px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'#94a3b8',borderBottom:'1px solid #e2e8f0'}}>Quoted</th>
                      <th style={{textAlign:'right',padding:'5px 8px',fontSize:'9px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'#94a3b8',borderBottom:'1px solid #e2e8f0'}}>Total</th>
                    </tr></thead>
                    <tbody>
                      {selected.lineItems.map(line=>(
                        <tr key={line.id}>
                          <td style={{padding:'8px',borderBottom:'1px solid #e2e8f0'}}>
                            <div style={{fontWeight:700,color:'#1e293b'}}>{line.productName}</div>
                            <div style={{fontSize:'10px',color:'#94a3b8'}}>QTY {line.quantity}</div>
                            {line.isPriceOverridden&&<span style={{fontSize:'9px',fontWeight:700,padding:'1px 5px',borderRadius:'4px',background:'#fef3c7',color:'#92400e'}}>-{Math.round(Math.abs(((line.unitPrice??0)-(line.catalogPriceAmount??0))/(line.catalogPriceAmount||1)*100))}% override</span>}
                          </td>
                          <td style={{textAlign:'right',padding:'8px',fontSize:'11px',color:'#64748b',borderBottom:'1px solid #e2e8f0'}}>{line.catalogPriceAmount!=null?formatQuoteMoney(line.catalogPriceAmount,line.catalogPriceCurrency):'—'}</td>
                          <td style={{textAlign:'right',padding:'8px',fontSize:'11px',fontWeight:700,color:line.isPriceOverridden?'#d97706':'#1e293b',borderBottom:'1px solid #e2e8f0'}}>{formatQuoteMoney(line.unitPrice,line.currency)}</td>
                          <td style={{textAlign:'right',padding:'8px',fontSize:'11px',fontWeight:700,borderBottom:'1px solid #e2e8f0'}}>{formatQuoteMoney(line.quantity*(line.unitPrice??0),line.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',fontSize:'13px',fontWeight:800,borderTop:'1px solid #e2e8f0',marginTop:'6px'}}>
                    <span style={{color:'#1e293b'}}>Quote total</span><span style={{color:'#0b2e4a'}}>{formatQuoteMoney(selected.subtotal,selected.currency)}</span>
                  </div>
                </div>
              )}
              {/* History */}
              {selectedHistory.length>0&&(
                <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'12px',padding:'12px 14px'}}>
                  <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'#94a3b8',marginBottom:'8px'}}>Quote history</div>
                  <QuoteHistoryList items={selectedHistory}/>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
