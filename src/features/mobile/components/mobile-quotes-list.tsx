'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { SetuIcon } from '@/components/ui/setu-icon';
import { formatQuoteMoney } from '@/features/quotes/logic/formatting';
import type { QuoteWorkspaceListItem } from '@/features/quotes/types/workspace';
import { cn } from '@/lib/utils';

type QuoteFilter = 'all' | 'needs_action' | 'awaiting' | 'accepted' | 'sent';

const filters: Array<{ key: QuoteFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'needs_action', label: 'Needs Action' },
  { key: 'awaiting', label: 'Awaiting' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'sent', label: 'Sent' },
];

function labelizeStatus(value: string) {
  return value.replaceAll('_', ' ');
}

function isNeedsAction(item: QuoteWorkspaceListItem) {
  return item.status === 'pending_approval' || item.status === 'approved' || item.hasPriceOverride;
}

function isAwaiting(item: QuoteWorkspaceListItem) {
  return item.status === 'sent' || item.status === 'negotiating';
}

function filterQuote(item: QuoteWorkspaceListItem, filter: QuoteFilter) {
  if (filter === 'needs_action') return isNeedsAction(item);
  if (filter === 'awaiting') return isAwaiting(item);
  if (filter === 'accepted') return item.status === 'accepted' || item.hasAcceptedContract;
  if (filter === 'sent') return item.status === 'sent';
  return true;
}

function statusClasses(item: QuoteWorkspaceListItem) {
  if (item.status === 'pending_approval') return 'bg-amber-100 text-amber-800 ring-1 ring-amber-200';
  if (item.status === 'approved' || item.status === 'accepted' || item.hasAcceptedContract) return 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200';
  if (item.status === 'sent' || item.status === 'negotiating') return 'bg-blue-100 text-blue-700 ring-1 ring-blue-200';
  if (item.status === 'rejected' || item.status === 'expired') return 'bg-rose-100 text-rose-700 ring-1 ring-rose-200';
  return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
}

function nextStepClasses(tone: QuoteWorkspaceListItem['nextStep']['tone']) {
  if (tone === 'orders') return 'from-emerald-600 to-teal-600';
  if (tone === 'approval') return 'from-amber-500 to-orange-500';
  if (tone === 'follow_up') return 'from-blue-600 to-sky-600';
  return 'from-slate-900 to-slate-700';
}

function whatsappHref(item: QuoteWorkspaceListItem) {
  const quoteRef = item.quoteNumber ?? item.id.slice(0, 8);
  const message = `Hi ${item.contactName ?? item.companyName}, sharing a quick update on quote ${quoteRef}. Current status: ${labelizeStatus(item.status)}. Next step: ${item.nextStep.label}.`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function QuoteCard({ item, active, onSelect }: { item: QuoteWorkspaceListItem; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-[1.5rem] border bg-white p-4 text-left shadow-sm transition',
        active ? 'border-blue-400 shadow-blue-100' : 'border-slate-200 hover:border-slate-300',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-black text-slate-950">{item.companyName}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{item.contactName ?? 'No contact'} · {item.quoteNumber ?? item.id.slice(0, 8)}</p>
        </div>
        <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em]', statusClasses(item))}>{labelizeStatus(item.status)}</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-slate-50 p-2">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Value</p>
          <p className="mt-1 text-xs font-black text-slate-900">{formatQuoteMoney(item.subtotal, item.currency)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-2">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Lines</p>
          <p className="mt-1 text-xs font-black text-slate-900">{item.lineItems.length}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-2">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">History</p>
          <p className="mt-1 text-xs font-black text-slate-900">{item.historyCount}</p>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-600">Next move</p>
        <p className="mt-1 text-sm font-black text-slate-950">{item.nextStep.label}</p>
        <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{item.nextStep.detail}</p>
      </div>
    </button>
  );
}

function QuoteDetail({ item, onClose }: { item: QuoteWorkspaceListItem; onClose: () => void }) {
  return (
    <aside className="fixed inset-x-0 bottom-0 z-[320] max-h-[86vh] overflow-y-auto rounded-t-[2rem] border border-slate-200 bg-white p-5 shadow-[0_-18px_45px_rgba(15,23,42,0.18)] md:hidden">
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
      <div className="sticky bottom-0 mt-5 flex gap-2 bg-white pb-1 pt-3">
        <Link href={item.nextStep.href} className={cn('flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-gradient-to-r px-4 text-sm font-black text-white shadow-lg', nextStepClasses(item.nextStep.tone))}>{item.nextStep.label}</Link>
        <a href={whatsappHref(item)} target="_blank" rel="noreferrer" className="flex min-h-12 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg" aria-label="Share quote update on WhatsApp"><SetuIcon name="mail" className="h-5 w-5" /></a>
      </div>
    </aside>
  );
}

export function MobileQuotesList({ items }: { items: QuoteWorkspaceListItem[] }) {
  const [filter, setFilter] = useState<QuoteFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const filteredItems = useMemo(() => items.filter((item) => filterQuote(item, filter)), [items, filter]);
  const selected = filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-28 pt-4">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 to-blue-950 p-5 text-white shadow-xl shadow-blue-950/20">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">Mobile quotes</p>
        <h1 className="mt-2 text-3xl font-black">Quote workspace</h1>
        <p className="mt-2 text-sm font-semibold text-blue-100">Track quote status, line items, negotiations, and the next action from the trade floor.</p>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-white/10 p-3"><p className="text-2xl font-black">{items.length}</p><p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-100">Total</p></div>
          <div className="rounded-2xl bg-white/10 p-3"><p className="text-2xl font-black">{items.filter(isNeedsAction).length}</p><p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-100">Action</p></div>
          <div className="rounded-2xl bg-white/10 p-3"><p className="text-2xl font-black">{items.filter((item) => item.status === 'accepted' || item.hasAcceptedContract).length}</p><p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-100">Accepted</p></div>
        </div>
      </section>

      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {filters.map((option) => (
          <button key={option.key} type="button" onClick={() => setFilter(option.key)} className={cn('shrink-0 rounded-full px-4 py-2 text-xs font-black transition', filter === option.key ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-slate-600 ring-1 ring-slate-200')}>{option.label}</button>
        ))}
      </div>

      <section className="mt-4 space-y-3">
        {filteredItems.length ? filteredItems.map((item) => <QuoteCard key={item.id} item={item} active={selected?.id === item.id} onSelect={() => setSelectedId(item.id)} />) : <div className="rounded-[1.5rem] bg-white p-6 text-center text-sm font-semibold text-slate-500">No quotes match this filter.</div>}
      </section>
      {selected ? <QuoteDetail item={selected} onClose={() => setSelectedId(null)} /> : null}
    </main>
  );
}
