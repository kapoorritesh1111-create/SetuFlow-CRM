'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SetuIcon } from '@/components/ui/setu-icon';
import {
  approveActualOrderLinesGateAction,
  closeOrderAction,
  updateActualOrderLineAction,
} from '@/features/orders/server';
import type { CatalogOrderOption8S, ProductionOrder8S } from './OrdersProductionWorkspace81DRepair3';
import { SearchBar, SwipeRow, PullToRefresh, SegmentedControl, StatusPill, PILL_TONE_SOLID_VAR, type PillTone } from '@/features/mobile/components/primitives';
import { DiscussionButton } from '@/components/chat/discussion-button';

type FilterKey = 'all' | 'ready' | 'blocked' | 'finance' | 'freight';

type Props = {
  orders: ProductionOrder8S[];
  catalogOptions: CatalogOrderOption8S[];
  organizationId: string;
  currentUserId: string;
  currentUserName: string;
};

function orderKey(order: ProductionOrder8S) {
  return order.orderId ?? order.quoteId;
}

function money(value: number | null | undefined, currency: string | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return 'Not available';
  return `${currency ?? 'USD'} ${Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function titleCase(value: string | null | undefined) {
  const text = String(value ?? '').trim();
  if (!text) return 'Not set';
  return text.replace(/[_-]+/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

function lineQty(line: ProductionOrder8S['lines'][number]) {
  const value = Number(line.actualQuantity ?? line.quotedQuantity ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function isBlocked(order: ProductionOrder8S) {
  return Boolean(order.blockerCount || order.blockerReasons.length || order.lines.some((line) => line.status === 'needs_actual_lines'));
}

function isFinanceReady(order: ProductionOrder8S) {
  return String(order.approvalState ?? order.currentStage ?? '').toLowerCase().includes('invoice') || String(order.paymentStatus ?? '').toLowerCase().includes('approved');
}

function isFreightReady(order: ProductionOrder8S) {
  return Boolean(order.packingPlan?.id || order.freightRateRequest?.id || order.shipment?.id);
}

function orderStatus(order: ProductionOrder8S) {
  if (isBlocked(order)) return 'Blocked';
  if (isFinanceReady(order)) return 'Finance ready';
  if (isFreightReady(order)) return 'Freight ready';
  return 'Ready now';
}

function orderStatusTone(order: ProductionOrder8S): PillTone {
  if (isBlocked(order)) return 'danger';
  if (isFinanceReady(order)) return 'info';
  if (isFreightReady(order)) return 'stage-contacted';
  return 'success';
}

function StatCard({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <div className="rounded-panel border border-white/10 bg-white/10 p-4 shadow-inner backdrop-blur">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-200">{label}</p>
      <p className="mt-3 text-4xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold text-white/65">{helper}</p>
    </div>
  );
}

function OrderCard({ order, selected, onClick }: { order: ProductionOrder8S; selected: boolean; onClick: () => void }) {
  const tone = orderStatusTone(order);
  return (
    <SwipeRow
      leftAction={{ label: '📄 Docs', tone: 'info' }}
      rightAction={{ label: '📞 Call', tone: 'success' }}
      onSwipeRight={onClick}
      onSwipeLeft={onClick}
    >
      <button type="button" onClick={onClick} className="w-full text-left">
        <article className={`flex gap-2.5 rounded-card border bg-white p-3.5 shadow-soft transition ${selected ? 'border-brand-400 shadow-[0_0_0_2px_rgba(31,72,124,.15)]' : 'border-line'}`}>
          <span className="w-[3px] shrink-0 self-stretch rounded-full" style={{ background: PILL_TONE_SOLID_VAR[tone] }} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-[13.5px] font-semibold text-content-primary">{order.companyName}</p>
              <div className="shrink-0 text-right">
                <p className="text-[13px] font-semibold tabular-nums text-content-primary">{money(order.actualTotal ?? order.quotedTotal, order.currency)}</p>
                <p className="text-right text-[9px] font-semibold text-content-faint">{order.lines.length} line{order.lines.length === 1 ? '' : 's'}</p>
              </div>
            </div>
            <p className="mt-0.5 truncate text-[11px] font-medium text-content-muted">{order.orderNumber ?? 'Order number pending'} · {titleCase(order.orderType)}</p>
            <div className="mt-1.5"><StatusPill tone={tone}>{orderStatus(order)}</StatusPill></div>
          </div>
        </article>
      </button>
    </SwipeRow>
  );
}

function LineEditor({ order }: { order: ProductionOrder8S }) {
  return (
    <div className="space-y-3">
      {order.lines.slice(0, 4).map((line) => (
        <form action={updateActualOrderLineAction} key={line.id} className="rounded-panel border border-slate-200 bg-white p-3 shadow-sm">
          <input type="hidden" name="quote_id" value={order.quoteId} />
          <input type="hidden" name="order_line_id" value={line.id} />
          <p className="text-sm font-black text-slate-950">{line.productName}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{line.skuCode ?? line.hsnCode ?? line.variantName ?? 'Catalog context pending'}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="grid gap-1"><span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Actual qty</span><input name="ordered_quantity" defaultValue={lineQty(line)} disabled={!line.isActual} className="min-h-11 rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-400" /></label>
            <label className="grid gap-1"><span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Unit price</span><input name="unit_price" defaultValue={line.unitPrice ?? ''} disabled={!line.isActual} className="min-h-11 rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-400" /></label>
          </div>
          <label className="mt-2 grid gap-1"><span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Reason / context</span><input name="change_reason" defaultValue={line.reason ?? 'Mobile order review.'} disabled={!line.isActual} className="min-h-11 rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-400" /></label>
          <button type="submit" disabled={!line.isActual} className="mt-3 min-h-11 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-black text-white shadow-[0_12px_28px_rgba(37,99,235,.25)] disabled:bg-slate-200 disabled:shadow-none">Save line</button>
        </form>
      ))}
      <form action={approveActualOrderLinesGateAction} className="rounded-panel bg-emerald-50 p-3">
        <input type="hidden" name="quote_id" value={order.quoteId} />
        <button type="submit" className="min-h-12 w-full rounded-2xl bg-emerald-500 text-sm font-black text-white shadow-[0_12px_28px_rgba(16,185,129,.24)]">Approve actual lines</button>
      </form>
    </div>
  );
}

function OrderActionSheet({ order, catalogOptions, onClose, organizationId, currentUserId, currentUserName }: { order: ProductionOrder8S | null; catalogOptions: CatalogOrderOption8S[]; onClose: () => void; organizationId: string; currentUserId: string; currentUserName: string }) {
  const [tab, setTab] = useState<'summary' | 'edit' | 'team'>('summary');
  if (!order) return null;
  return (
    <div className="fixed inset-0 z-[500] bg-slate-950/35 backdrop-blur-sm" onClick={onClose}>
      <section className="absolute bottom-[calc(86px+env(safe-area-inset-bottom))] left-1/2 flex max-h-[calc(100dvh-126px)] w-full max-w-[430px] -translate-x-1/2 flex-col overflow-hidden rounded-t-hero bg-white shadow-[0_-30px_80px_rgba(15,23,42,.28)]" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-300" />
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Order actions</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">{order.companyName}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">{order.orderNumber ?? 'Order number pending'} • {money(order.actualTotal ?? order.quotedTotal, order.currency)}</p>
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1"><button type="button" onClick={() => setTab('summary')} className={`min-h-10 rounded-xl text-sm font-black ${tab === 'summary' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>Summary</button><button type="button" onClick={() => setTab('edit')} className={`min-h-10 rounded-xl text-sm font-black ${tab === 'edit' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>Edit lines</button><button type="button" onClick={() => setTab('team')} className={`min-h-10 rounded-xl text-sm font-black ${tab === 'team' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>Team</button></div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'summary' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Status</p><p className="mt-1 text-sm font-black text-slate-900">{orderStatus(order)}</p></div><div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Docs</p><p className="mt-1 text-sm font-black text-slate-900">{order.documentCount}</p></div></div>
              <p className="rounded-2xl bg-blue-50 p-3 text-sm font-semibold leading-6 text-blue-900">{order.nextAction}</p>
              {order.blockerReasons.length ? <div className="rounded-2xl bg-rose-50 p-3"><p className="text-xs font-black uppercase tracking-[0.12em] text-rose-600">Blockers</p>{order.blockerReasons.slice(0, 3).map((reason) => <p key={reason} className="mt-2 text-sm font-semibold text-rose-800">• {reason}</p>)}</div> : null}
              <form action={closeOrderAction}><input type="hidden" name="quote_id" value={order.quoteId} /><button type="submit" className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-800">Close order</button></form>
            </div>
          ) : tab === 'edit' ? (
            <>
              <LineEditor order={order} />
              {catalogOptions.length ? <p className="mt-3 text-xs font-semibold text-slate-400">Catalog add-line options are available on desktop; mobile currently focuses on editing loaded order lines.</p> : null}
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold leading-5 text-slate-500">Internal team discussion on this order — not visible to the buyer or supplier.</p>
              <DiscussionButton entityType="order" entityId={order.orderId ?? order.quoteId} organizationId={organizationId} currentUserId={currentUserId} currentUserName={currentUserName} title={`Order ${order.orderNumber ?? 'pending'} discussion`} label="Order discussion" />
              {order.shipment?.id ? (
                <DiscussionButton entityType="dispatch" entityId={order.shipment.id} organizationId={organizationId} currentUserId={currentUserId} currentUserName={currentUserName} title={`Dispatch ${order.shipment.trackingNumber ?? order.shipment.bookingReference ?? ''} discussion`} label="Dispatch discussion" />
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export function MobileOrdersWorkspace({ orders, catalogOptions, organizationId, currentUserId, currentUserName }: Props) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const ready = orders.filter((order) => !isBlocked(order));
  const blocked = orders.filter(isBlocked);
  const finance = orders.filter(isFinanceReady);
  const freight = orders.filter(isFreightReady);
  const selected = selectedId ? orders.find((order) => orderKey(order) === selectedId) ?? null : null;
  const q = query.trim().toLowerCase();
  const filtered = orders.filter((order) => {
    const matchesFilter = filter === 'all' || (filter === 'ready' && !isBlocked(order)) || (filter === 'blocked' && isBlocked(order)) || (filter === 'finance' && isFinanceReady(order)) || (filter === 'freight' && isFreightReady(order));
    const matchesQuery = !q || order.companyName.toLowerCase().includes(q) || (order.orderNumber ?? '').toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  });
  const filters: Array<{ key: FilterKey; label: string }> = [{ key: 'all', label: 'All' }, { key: 'ready', label: 'Ready' }, { key: 'blocked', label: 'Blocked' }, { key: 'finance', label: 'Finance' }, { key: 'freight', label: 'Freight' }];
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentMode = searchParams.get('mode') === 'buyers' ? 'buyer' : searchParams.get('mode') === 'suppliers' ? 'supplier' : 'all';
  function changeMode(next: 'all' | 'buyer' | 'supplier') {
    router.push(`/orders?mode=${next === 'buyer' ? 'buyers' : next === 'supplier' ? 'suppliers' : 'all'}`);
  }
  return (
    <PullToRefresh onRefresh={() => { router.refresh(); return new Promise((resolve) => setTimeout(resolve, 500)); }}>
    <div className="space-y-5 pb-5">
      <SegmentedControl options={[{ value: 'all' as const, label: 'All' }, { value: 'buyer' as const, label: 'Buyer' }, { value: 'supplier' as const, label: 'Supplier' }]} value={currentMode} onChange={changeMode} />
      <SearchBar placeholder="Search orders" value={query} onChange={setQuery} />
      <div className="flex gap-3 overflow-x-auto pb-1 pt-2">{filters.map((item) => <button key={item.key} type="button" onClick={() => setFilter(item.key)} className={`min-h-12 min-w-[6.25rem] rounded-full px-5 text-sm font-black shadow-sm ${filter === item.key ? 'bg-brand-700 text-white shadow-black/20' : 'bg-white/85 text-slate-800 ring-1 ring-white/80'}`}>{item.label}</button>)}</div>
      <section className="rounded-hero bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,.20),transparent_34%),linear-gradient(135deg,#061c2e,#0b2e4a_62%,#061426)] p-5 text-white shadow-[0_28px_80px_rgba(15,23,42,.28)]"><div className="flex items-start gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-400/20 text-amber-200"><SetuIcon name="orders" className="h-6 w-6" /></span><div><p className="text-xs font-black uppercase tracking-[0.2em] text-white/90">Order command center</p><p className="mt-1 text-sm text-white/68">Execution queue and mobile edits</p></div></div><div className="mt-5 grid grid-cols-3 gap-3"><StatCard label="All" value={orders.length} helper="Orders" /><StatCard label="Ready" value={ready.length} helper="No blocker" /><StatCard label="Blocked" value={blocked.length} helper="Review" /></div></section>
      <section className="rounded-hero bg-white/95 p-4 shadow-[0_20px_60px_rgba(15,23,42,.08)] ring-1 ring-white/80"><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Queues</p><div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-blue-50 p-3"><p className="text-2xl font-black text-blue-900">{finance.length}</p><p className="text-xs font-bold text-blue-600">Finance-ready</p></div><div className="rounded-2xl bg-cyan-50 p-3"><p className="text-2xl font-black text-cyan-900">{freight.length}</p><p className="text-xs font-bold text-cyan-600">Freight-ready</p></div></div></section>
      <div className="space-y-3">{filtered.map((order) => <OrderCard key={orderKey(order)} order={order} selected={selectedId === orderKey(order)} onClick={() => setSelectedId(orderKey(order))} />)}{filtered.length === 0 ? <div className="rounded-panel border border-dashed border-slate-200 bg-white/80 p-6 text-center"><p className="text-sm font-black text-slate-900">No matching orders</p><p className="mt-1 text-xs text-slate-500">Choose another filter to see the queue.</p></div> : null}</div>
      <OrderActionSheet order={selected} catalogOptions={catalogOptions} onClose={() => setSelectedId(null)} organizationId={organizationId} currentUserId={currentUserId} currentUserName={currentUserName} />
    </div>
    </PullToRefresh>
  );
}
