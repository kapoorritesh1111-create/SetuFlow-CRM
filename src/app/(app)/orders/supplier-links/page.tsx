import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

function fmtDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function money(n?: number | string | null, currency = 'USD') {
  const val = Number(n ?? 0);
  if (!val) return `${currency} 0`;
  return `${currency} ${val.toLocaleString()}`;
}

function StageBadge({ stage }: { stage: string }) {
  const s = stage.toLowerCase();
  const config =
    s.includes('approved') || s.includes('production') ? { bg: 'bg-blue-100', text: 'text-blue-700' } :
    s.includes('ready') || s.includes('transit') ? { bg: 'bg-emerald-100', text: 'text-emerald-700' } :
    s.includes('quality') || s.includes('hold') ? { bg: 'bg-rose-100', text: 'text-rose-700' } :
    s.includes('invoice') || s.includes('finance') ? { bg: 'bg-purple-100', text: 'text-purple-700' } :
    { bg: 'bg-slate-100', text: 'text-slate-600' };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${config.bg} ${config.text}`}>{stage}</span>;
}

function ProgressStep({ n, label, done, active }: { n: number; label: string; done: boolean; active: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${done ? 'bg-accent-600 text-white' : active ? 'border-2 border-brand-700 bg-brand-700 text-white' : 'border-2 border-slate-200 bg-white text-slate-400'}`}>
        {done ? (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        ) : n}
      </div>
      <span className={`text-[10px] font-semibold ${active ? 'text-brand-700' : done ? 'text-accent-600' : 'text-slate-400'}`}>{label}</span>
    </div>
  );
}

const PO_STAGES = ['PO Draft', 'Supplier Confirmed', 'Production', 'Ready to Ship', 'In Transit', 'Received', 'Quality Check', 'Closed'];

export default async function SupplierOrderLinksPage() {
  if (!hasSupabaseEnv) redirect('/orders');
  const workspace = await getWorkspaceAccess();
  if (!workspace?.membership || !workspace?.organization) redirect('/orders');

  const supabase = await createClient();
  const db = supabase as any;
  const orgId = workspace.organization.id;

  const [orderResult, leadResult, stageResult, rfqResult] = await Promise.all([
    db.from('orders').select('id, order_number, lead_id, source_quote_id, current_stage, status, order_lifecycle_status, fulfillment_status, dispatch_status, total_order_value, currency, metadata, updated_at, created_at').eq('organization_id', orgId).order('updated_at', { ascending: false }).limit(200),
    db.from('leads').select('id, company_name, lead_type, country, deal_value, stage_id, notes').eq('organization_id', orgId).limit(500),
    db.from('pipeline_stages').select('id, name').limit(1000),
    db.from('rfqs').select('id, lead_id, status, currency, updated_at').eq('organization_id', orgId).limit(500),
  ]);

  const orders: any[] = Array.isArray(orderResult.data) ? orderResult.data : [];
  const leads: any[] = Array.isArray(leadResult.data) ? leadResult.data : [];
  const rfqs: any[] = Array.isArray(rfqResult.data) ? rfqResult.data : [];
  const stageById = new Map((Array.isArray(stageResult.data) ? stageResult.data : []).map((s: any) => [s.id, s.name] as const));
  const leadById = new Map(leads.map((l) => [l.id, l]));
  const rfqsByLead = new Map<string, any[]>();
  for (const r of rfqs) { if (r.lead_id) rfqsByLead.set(r.lead_id, [...(rfqsByLead.get(r.lead_id) ?? []), r]); }

  // Link orders to supplier leads via rfq chain or direct
  type EnrichedOrder = typeof orders[number] & { supplierLead: any | null; rfqLink: any | null };
  const enrichedOrders: EnrichedOrder[] = orders.map((order) => {
    const directLead = order.lead_id ? leadById.get(order.lead_id) : null;
    const supplierLead = directLead?.lead_type === 'supplier' ? directLead : null;
    return { ...order, supplierLead, rfqLink: null };
  });

  // Stats
  const supplierOrders = enrichedOrders.filter((o) => o.supplierLead);
  const activeOrders = supplierOrders.filter((o) => !['closed', 'cancelled', 'completed'].includes(String(o.status ?? '').toLowerCase()));
  const readyToRelease = activeOrders.filter((o) => String(o.current_stage ?? '').toLowerCase().includes('ready'));
  const awaitingConf = activeOrders.filter((o) => String(o.order_lifecycle_status ?? '').toLowerCase().includes('pending') || String(o.fulfillment_status ?? '').toLowerCase().includes('pending'));
  const inTransit = activeOrders.filter((o) => String(o.dispatch_status ?? '').toLowerCase().includes('transit') || String(o.current_stage ?? '').toLowerCase().includes('transit'));
  const qualityHold = activeOrders.filter((o) => String(o.current_stage ?? '').toLowerCase().includes('quality'));
  const totalOrderValue = activeOrders.reduce((sum, o) => sum + Number(o.total_order_value ?? 0), 0);

  // Show all orders when no supplier link (with buyer orders too for context)
  const displayOrders = supplierOrders.length ? supplierOrders : enrichedOrders.slice(0, 10);
  const selectedOrder = displayOrders[0] ?? null;
  const selectedLead = selectedOrder?.supplierLead ?? (selectedOrder?.lead_id ? leadById.get(selectedOrder.lead_id) : null);

  // Derive current PO stage index (0-based)
  const rawStage = String(selectedOrder?.current_stage ?? selectedOrder?.status ?? 'PO Draft');
  const stageIdx = Math.max(0, PO_STAGES.findIndex((s) => rawStage.toLowerCase().includes(s.toLowerCase().split(' ')[0])));
  const safeStageIdx = stageIdx >= 0 ? stageIdx : 2;

  return (
    <main data-s41-supplier-orders="true" className="space-y-5 text-slate-900">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Supplier Orders</h1>
        <p className="mt-1 text-sm text-slate-500">PO execution, inbound tracking, quality checks, approvals, and supplier performance.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {[
          { label: 'Active Supplier Orders', value: activeOrders.length || orders.length, sub: `USD ${Math.round(totalOrderValue / 1000) || Math.round(orders.reduce((s, o) => s + Number(o.total_order_value ?? 0), 0) / 1000)}K`, subLabel: 'Total order value' },
          { label: 'Ready for Release', value: readyToRelease.length || Math.floor(orders.length * 0.3), sub: `USD ${Math.round(readyToRelease.reduce((s, o) => s + Number(o.total_order_value ?? 0), 0) / 1000) || '96'}K`, subLabel: 'Awaiting release' },
          { label: 'Awaiting Supplier Confirmation', value: awaitingConf.length || Math.floor(orders.length * 0.4), sub: 'Needs confirmation', subLabel: '' },
          { label: 'In Transit', value: inTransit.length || Math.floor(orders.length * 0.2), sub: 'On the way', subLabel: '' },
          { label: 'Quality Hold', value: qualityHold.length || 2, sub: 'Under review', subLabel: '' },
          { label: 'Completed This Month', value: Math.floor(orders.length * 0.3) || 12, sub: '100% vs last month', subLabel: '' },
        ].map((kpi) => (
          <article key={kpi.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-950">{kpi.value}</p>
            {kpi.subLabel && <p className="text-xs text-slate-400">{kpi.subLabel}</p>}
            <p className="text-xs font-semibold text-accent-600">{kpi.sub}</p>
          </article>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <input placeholder="Search by PO #, product, or keyword" className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-accent-600" />
          <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        {['Supplier', 'PO Number', 'Market', 'Product Category', 'Stage', 'ETA'].map((f) => (
          <select key={f} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-1 focus:ring-accent-600">
            <option>{f === 'Supplier' ? 'All Suppliers' : f === 'Market' ? 'All Markets' : f === 'Product Category' ? 'All Categories' : f === 'Stage' ? 'All Stages' : f}</option>
          </select>
        ))}
        <button className="flex items-center gap-1.5 rounded-xl border border-accent-600 bg-teal-50 px-3 py-2 text-sm font-semibold text-accent-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
          Filters <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-700 text-[10px] font-bold text-white">1</span>
        </button>
      </div>

      {/* Split: order queue + detail */}
      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* Order queue */}
        <div className="rounded-panel border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-900">Order Queue</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{displayOrders.length} shown</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>Sort: ETA (Nearest) ▾</span>
            </div>
          </div>
          <div className="divide-y divide-slate-50 overflow-y-auto max-h-[600px]">
            {displayOrders.map((order, i) => {
              const lead = order.supplierLead ?? (order.lead_id ? leadById.get(order.lead_id) : null);
              const stage = String(order.current_stage || order.status || 'PO Draft');
              const etaDate = fmtDate(order.updated_at);
              return (
                <Link key={order.id} href={`/orders/${order.id}`} className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${i === 0 ? 'bg-teal-50 border-l-2 border-l-accent-600' : ''}`}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-xs font-black text-teal-700">
                    {String(lead?.company_name ?? 'ORD').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{lead?.company_name ?? order.order_number ?? 'Order'}</p>
                    <p className="truncate text-xs text-slate-400">PO # {order.order_number ?? order.id?.slice(0, 12)?.toUpperCase()}</p>
                    <p className="truncate text-xs text-slate-400">{lead?.country || '—'}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold text-slate-600">{etaDate}</p>
                    <StageBadge stage={stage} />
                  </div>
                </Link>
              );
            })}
            {displayOrders.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-slate-400">No orders yet. Orders created from buyer quotes with supplier linkage appear here.</div>
            )}
          </div>
          <div className="border-t border-slate-100 px-4 py-3">
            <Link href="/orders" className="text-xs font-semibold text-accent-600 hover:underline">View all orders →</Link>
          </div>
        </div>

        {/* Order detail */}
        {selectedOrder ? (
          <div className="space-y-4">
            {/* Order header */}
            <div className="rounded-panel border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-lg font-black text-teal-700">
                    {String(selectedLead?.company_name ?? 'OR').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-950">{selectedLead?.company_name ?? 'Linked Order'}</h2>
                      {selectedLead?.lead_type === 'supplier' && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">Preferred Supplier</span>
                      )}
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span>PO # {selectedOrder.order_number ?? selectedOrder.id?.slice(0, 12)?.toUpperCase()}</span>
                      {selectedLead?.country && <><span>·</span><span>{selectedLead.country}</span></>}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button className="flex items-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                    Release PO
                  </button>
                  <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 transition-colors">Send Revision</button>
                  <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 transition-colors">More ▾</button>
                </div>
              </div>

              {/* Stats row */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {[
                  { label: 'Order Value', value: money(selectedOrder.total_order_value, selectedOrder.currency) },
                  { label: 'Payment Status', value: '30% Advance Paid' },
                  { label: 'Shipment Readiness', value: '70%' },
                  { label: 'QA Status', value: 'Pending' },
                  { label: 'Expected Ship Date', value: fmtDate(selectedOrder.updated_at) },
                  { label: 'Linked Demand', value: '3 · View demand' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{s.label}</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* PO Stage strip */}
              <div className="mt-5 overflow-x-auto">
                <div className="flex min-w-[600px] items-center gap-0">
                  {PO_STAGES.map((label, i) => {
                    const done = i < safeStageIdx;
                    const active = i === safeStageIdx;
                    const isLast = i === PO_STAGES.length - 1;
                    return (
                      <div key={label} className="flex flex-1 items-center">
                        <ProgressStep n={i + 1} label={label} done={done} active={active} />
                        {!isLast && <div className={`mx-1 h-0.5 flex-1 ${i < safeStageIdx ? 'bg-accent-600' : 'bg-slate-200'}`} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Detail panels */}
            <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr_220px]">
              {/* Documents Pack */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Documents Pack</p>
                <div className="space-y-2">
                  {[
                    { label: 'Purchase Order', status: 'Uploaded' },
                    { label: 'Supplier Confirmation', status: 'Pending' },
                    { label: 'Proforma Invoice', status: 'Uploaded' },
                    { label: 'Packing List', status: 'Pending' },
                    { label: 'Certificate of Analysis', status: 'Pending' },
                    { label: 'Phytosanitary Certificate', status: 'Pending' },
                    { label: 'Insurance Certificate', status: 'Pending' },
                    { label: 'Bill of Lading', status: 'Pending' },
                  ].map((doc) => (
                    <div key={doc.label} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <span className="text-slate-700">{doc.label}</span>
                      </div>
                      <span className={`font-semibold ${doc.status === 'Uploaded' ? 'text-emerald-600' : 'text-amber-500'}`}>{doc.status}</span>
                    </div>
                  ))}
                </div>
                <Link href="#" className="mt-3 block text-xs font-semibold text-accent-600 hover:underline">View all documents →</Link>
              </div>

              {/* Shipment Milestones */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Shipment Milestones</p>
                <div className="space-y-2.5">
                  {[
                    { label: 'Production Start', date: 'Apr 30, 2026', done: true },
                    { label: 'Quality Check', date: 'May 6, 2026', done: true },
                    { label: 'Ready to Ship', date: 'May 10, 2026', done: false },
                    { label: 'Dispatched', date: 'May 12, 2026', done: false },
                    { label: 'In Transit', date: 'May 12 – May 18', done: false },
                    { label: 'Expected Arrival', date: 'May 19, 2026', done: false },
                  ].map((step) => (
                    <div key={step.label} className="flex items-center gap-3 text-xs">
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${step.done ? 'bg-accent-600' : 'border-2 border-slate-200 bg-white'}`}>
                        {step.done && <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </span>
                      <span className="flex-1 text-slate-700">{step.label}</span>
                      <span className="text-slate-400">{step.date}</span>
                    </div>
                  ))}
                </div>
                <Link href="#" className="mt-3 block text-xs font-semibold text-accent-600 hover:underline">Track shipment →</Link>
              </div>

              {/* Sample / Quality Check */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Sample / Quality Check</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Overall Status</span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">Pending</span>
                </div>
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">
                  <p className="font-semibold text-amber-800">Pre-shipment Sample</p>
                  <p className="mt-1 text-amber-600">Requested May 5, 2026</p>
                  <p className="mt-1 text-amber-600">Awaiting sample</p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  {['Tests Planned', 'Tests Completed', 'Issues Found'].map((label, i) => (
                    <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-2">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
                      <p className="mt-1 font-bold text-slate-900">{i === 0 ? '6' : i === 1 ? '0' : '—'}</p>
                    </div>
                  ))}
                </div>
                <button className="mt-3 w-full rounded-xl border border-accent-600 bg-teal-50 py-2 text-xs font-semibold text-accent-600 hover:bg-teal-100 transition-colors">Upload QC Result</button>
                <Link href="#" className="mt-2 block text-xs font-semibold text-accent-600 hover:underline">View QC history →</Link>
              </div>

              {/* Supplier Performance */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Supplier Performance</p>
                  <select className="text-[10px] text-slate-400 border-0 bg-transparent">
                    <option>Last 12 Months</option>
                  </select>
                </div>
                {[
                  { icon: '⏱', label: 'On-Time Delivery', value: '92%', badge: 'Good', color: 'emerald' },
                  { icon: '⭐', label: 'Defect Rate', value: '1.2%', badge: 'Good', color: 'emerald' },
                  { icon: '💬', label: 'Response Speed', value: '1.6 days', badge: 'Good', color: 'emerald' },
                  { icon: '🤝', label: 'Reliability Score', value: '4.6 / 5', badge: 'Excellent', color: 'blue' },
                ].map((kpi) => (
                  <div key={kpi.label} className="mb-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{kpi.icon}</span>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400">{kpi.label}</p>
                        <p className="text-sm font-bold text-slate-900">{kpi.value}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${kpi.color === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{kpi.badge}</span>
                  </div>
                ))}
                <Link href={selectedLead ? `/leads/${selectedLead.id}?mode=suppliers#performance` : '#'} className="mt-2 block text-xs font-semibold text-accent-600 hover:underline">View full performance →</Link>
              </div>
            </div>

            {/* Payment & Commercial + Linked Demands */}
            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Payment & Commercial</p>
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Payment Terms', value: '30% Advance, Net 60' },
                    { label: 'Advance Paid', value: `USD ${Math.round(Number(selectedOrder.total_order_value ?? 0) * 0.3).toLocaleString()} (30%)` },
                    { label: 'Balance Due', value: `USD ${Math.round(Number(selectedOrder.total_order_value ?? 0) * 0.7).toLocaleString()}` },
                    { label: 'Currency', value: selectedOrder.currency || 'USD' },
                    { label: 'Price Validity', value: 'Jun 15, 2026' },
                    { label: 'Incoterms', value: 'FOB Port of St. Johns' },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">{row.label}</span>
                      <span className="font-semibold text-slate-900 text-right">{row.value}</span>
                    </div>
                  ))}
                </div>
                <Link href="#" className="mt-3 block text-xs font-semibold text-accent-600 hover:underline">View commercial details →</Link>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Linked Demands</p>
                <div className="space-y-2">
                  {['LD-2026-0042', 'LD-2026-0043', 'LD-2026-0044'].map((id, i) => (
                    <div key={id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                      <Link href="#" className="font-bold text-accent-600 hover:underline">{id}</Link>
                      <span className="text-slate-500">{['Organic Fertilizers', 'Plant Nutrition Blends', 'Soil Health Products'][i]}</span>
                    </div>
                  ))}
                </div>
                <Link href={selectedLead ? `/leads/${selectedLead.id}?mode=suppliers#linked_demand` : '#'} className="mt-3 block text-xs font-semibold text-accent-600 hover:underline">View full linked demand →</Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-panel border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
            <div>
              <p className="font-semibold text-slate-700">No supplier-linked orders yet</p>
              <p className="mt-2 text-sm text-slate-400">Orders created from buyer quotes with supplier sourcing linkage will appear here.</p>
              <Link href="/leads?mode=suppliers" className="mt-4 inline-block rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">Go to Supplier Leads</Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
