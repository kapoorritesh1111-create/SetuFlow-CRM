'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SetuIcon } from '@/components/ui/setu-icon';
import { formatQuoteMoney } from '@/features/quotes/logic/formatting';
import type { QuoteWorkspaceListItem } from '@/features/quotes/types/workspace';
import { cn } from '@/lib/utils';
import { SearchBar, SwipeRow, PullToRefresh, SegmentedControl, StatusPill, PILL_TONE_SOLID_VAR, type PillTone } from '@/features/mobile/components/primitives';
import { DiscussionButton } from '@/components/chat/discussion-button';

type QuoteFilter = 'all' | 'needs_action' | 'accepted';

function labelizeStatus(value: string) {
  return value.replaceAll('_', ' ');
}

function isNeedsAction(item: QuoteWorkspaceListItem) {
  return item.status === 'pending_approval' || item.status === 'approved' || item.hasPriceOverride;
}

function filterQuote(item: QuoteWorkspaceListItem, filter: QuoteFilter) {
  if (filter === 'needs_action') return isNeedsAction(item);
  if (filter === 'accepted') return item.status === 'accepted' || item.hasAcceptedContract;
  return true;
}

function statusTone(item: QuoteWorkspaceListItem): PillTone {
  if (item.status === 'pending_approval') return 'warning';
  if (item.status === 'approved' || item.status === 'accepted' || item.hasAcceptedContract) return 'success';
  if (item.status === 'sent' || item.status === 'negotiating') return 'stage-contacted';
  if (item.status === 'rejected' || item.status === 'expired') return 'danger';
  return 'neutral';
}

function nextStepClasses(tone: QuoteWorkspaceListItem['nextStep']['tone']) {
  if (tone === 'orders') return 'bg-success-solid';
  if (tone === 'approval') return 'bg-warning-solid';
  if (tone === 'follow_up') return 'bg-stage-contacted-solid';
  return 'bg-brand-700';
}

function whatsappHref(item: QuoteWorkspaceListItem) {
  const quoteRef = item.quoteNumber ?? item.id.slice(0, 8);
  const message = `Hi ${item.contactName ?? item.companyName}, sharing a quick update on quote ${quoteRef}. Current status: ${labelizeStatus(item.status)}. Next step: ${item.nextStep.label}.`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function QuoteCard({ item, active, onSelect }: { item: QuoteWorkspaceListItem; active: boolean; onSelect: () => void }) {
  const tone = statusTone(item);
  return (
    <SwipeRow
      leftAction={item.status === 'pending_approval' ? { label: '✓ Approve', tone: 'success' } : undefined}
      rightAction={{ label: '✎ Revise', tone: 'stage-contacted' }}
      onSwipeRight={item.status === 'pending_approval' ? onSelect : undefined}
      onSwipeLeft={onSelect}
    >
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'flex w-full gap-2.5 rounded-card border bg-surface-1 p-3.5 text-left shadow-soft transition',
          active ? 'border-brand-400 shadow-[0_0_0_2px_rgba(31,72,124,.15)]' : 'border-line',
        )}
      >
        <span className="w-[3px] shrink-0 self-stretch rounded-full" style={{ background: PILL_TONE_SOLID_VAR[tone] }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[13.5px] font-semibold text-content-primary">{item.companyName}</p>
            <div className="shrink-0 text-right">
              <p className="text-[13px] font-semibold tabular-nums text-content-primary">{formatQuoteMoney(item.subtotal, item.currency)}</p>
              <p className="text-right text-[9px] font-semibold text-content-faint">{item.quoteNumber ?? item.id.slice(0, 8)}</p>
            </div>
          </div>
          <p className="mt-0.5 truncate text-[11px] font-medium text-content-muted">{item.contactName ?? 'No contact'} · {item.lineItems.length} line{item.lineItems.length === 1 ? '' : 's'}</p>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <StatusPill tone={tone}>{labelizeStatus(item.status)}</StatusPill>
            <p className="max-w-[55%] truncate text-[10.5px] font-medium text-content-faint">{item.nextStep.label}</p>
          </div>
        </div>
      </button>
    </SwipeRow>
  );
}

function QuoteDetail({ item, onClose, organizationId, currentUserId, currentUserName }: { item: QuoteWorkspaceListItem; onClose: () => void; organizationId: string; currentUserId: string; currentUserName: string }) {
  return (
    <aside className="fixed inset-x-0 bottom-0 z-[320] max-h-[82vh] overflow-y-auto rounded-t-hero border border-slate-200 bg-white p-5 pb-[calc(92px+env(safe-area-inset-bottom))] shadow-[0_-18px_45px_rgba(15,23,42,0.18)] md:hidden">
      <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">Quote detail</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">{item.companyName}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">{item.quoteNumber ?? item.id.slice(0, 8)} · {labelizeStatus(item.status)}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">Close</button>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Value</p><p className="mt-1 text-lg font-black text-slate-950">{formatQuoteMoney(item.subtotal, item.currency)}</p></div>
        <div className="rounded-3xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Versions</p><p className="mt-1 text-lg font-black text-slate-950">{item.totalVersions}</p></div>
      </div>
      <section className="mt-5">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Line items</p>
        <div className="mt-2 space-y-2">
          {item.lineItems.length ? item.lineItems.map((line) => (
            <div key={line.id} className="rounded-2xl border border-slate-200 p-3">
              <p className="text-sm font-black text-slate-950">{line.productName}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Qty {line.quantity} · {formatQuoteMoney(line.unitPrice, line.currency)} each</p>
              {line.isPriceOverridden ? <p className="mt-2 rounded-xl bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800">Price override: {line.overrideReason ?? 'No reason captured'}</p> : null}
            </div>
          )) : <p className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">No line items captured.</p>}
        </div>
      </section>
      {item.lastNegotiationMessage ? <p className="mt-4 rounded-2xl bg-blue-50 p-3 text-sm font-semibold text-blue-900">{item.lastNegotiationMessage}</p> : null}
      <section className="mt-4">
        <DiscussionButton
          entityType="quote"
          entityId={item.id}
          organizationId={organizationId}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          title={`Quote ${item.quoteNumber ?? item.id.slice(0, 8)} discussion`}
          autoEnrollUsers={[currentUserId].filter(Boolean)}
          label="Team discussion"
        />
      </section>
      <div className="sticky bottom-0 mt-5 flex gap-2 bg-white pb-1 pt-3">
        <Link href={item.nextStep.href} className={cn('flex min-h-12 flex-1 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-white shadow-lg', nextStepClasses(item.nextStep.tone))}>{item.nextStep.label}</Link>
        <a href={whatsappHref(item)} target="_blank" rel="noreferrer" className="flex min-h-12 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg" aria-label="Share quote update on WhatsApp"><SetuIcon name="mail" className="h-5 w-5" /></a>
      </div>
    </aside>
  );
}

function KpiFilterCard({ label, value, active, onClick }: { label: string; value: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-2xl p-3 text-center transition',
        active ? 'bg-white text-brand-700 shadow-lg shadow-black/20' : 'bg-white/10 text-white hover:bg-white/15',
      )}
    >
      <p className="text-2xl font-black">{value}</p>
      <p className={cn('text-[10px] font-black uppercase tracking-[0.12em]', active ? 'text-blue-600' : 'text-blue-100')}>{label}</p>
    </button>
  );
}

export function MobileQuotesList({ items, organizationId, currentUserId, currentUserName }: { items: QuoteWorkspaceListItem[]; organizationId: string; currentUserId: string; currentUserName: string }) {
  const [filter, setFilter] = useState<QuoteFilter>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentMode = searchParams.get('mode') === 'buyers' ? 'buyer' : searchParams.get('mode') === 'suppliers' ? 'supplier' : 'all';
  function changeMode(next: 'all' | 'buyer' | 'supplier') {
    router.push(`/quotes?mode=${next === 'buyer' ? 'buyers' : next === 'supplier' ? 'suppliers' : 'all'}`);
  }
  const filteredItems = useMemo(() => {
    const byKpi = items.filter((item) => filterQuote(item, filter));
    const q = query.trim().toLowerCase();
    if (!q) return byKpi;
    return byKpi.filter((item) => item.companyName.toLowerCase().includes(q) || (item.quoteNumber ?? '').toLowerCase().includes(q));
  }, [items, filter, query]);
  const selected = selectedId ? filteredItems.find((item) => item.id === selectedId) ?? null : null;
  const actionCount = items.filter(isNeedsAction).length;
  const acceptedCount = items.filter((item) => item.status === 'accepted' || item.hasAcceptedContract).length;
  const activeLabel = filter === 'needs_action' ? 'Needs action' : filter === 'accepted' ? 'Accepted' : 'All quotes';

  return (
    <PullToRefresh onRefresh={() => { router.refresh(); return new Promise((resolve) => setTimeout(resolve, 500)); }}>
    <main className="min-h-screen bg-slate-50 px-4 pb-28 pt-4">
      <section className="rounded-hero bg-gradient-to-br from-brand-900 to-brand-700 p-5 text-white shadow-xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-200">Quotes</p>
        <h1 className="mt-2 text-2xl font-black">Work queue</h1>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <KpiFilterCard label="Total" value={items.length} active={filter === 'all'} onClick={() => setFilter('all')} />
          <KpiFilterCard label="Action" value={actionCount} active={filter === 'needs_action'} onClick={() => setFilter('needs_action')} />
          <KpiFilterCard label="Accepted" value={acceptedCount} active={filter === 'accepted'} onClick={() => setFilter('accepted')} />
        </div>
      </section>

      <div className="mt-4"><SegmentedControl options={[{ value: 'all' as const, label: 'All' }, { value: 'buyer' as const, label: 'Buyer' }, { value: 'supplier' as const, label: 'Supplier' }]} value={currentMode} onChange={changeMode} /></div>
      <SearchBar placeholder="Search quotes" value={query} onChange={setQuery} />

      <section className="mt-4 flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">{activeLabel}</p>
          <p className="text-xs font-semibold text-slate-500">Showing {filteredItems.length} of {items.length}</p>
        </div>
        {filter !== 'all' ? <button type="button" onClick={() => setFilter('all')} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">Clear</button> : null}
      </section>

      <section className="mt-4 space-y-3">
        {filteredItems.length ? filteredItems.map((item) => <QuoteCard key={item.id} item={item} active={selected?.id === item.id} onSelect={() => setSelectedId(item.id)} />) : <div className="rounded-panel bg-white p-6 text-center text-sm font-semibold text-slate-500">No quotes match this KPI filter.</div>}
      </section>
      {selected ? <QuoteDetail item={selected} onClose={() => setSelectedId(null)} organizationId={organizationId} currentUserId={currentUserId} currentUserName={currentUserName} /> : null}
    </main>
    </PullToRefresh>
  );
}
