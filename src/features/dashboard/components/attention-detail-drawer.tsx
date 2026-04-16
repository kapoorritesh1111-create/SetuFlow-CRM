'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { AttentionItem } from '@/features/dashboard/types';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

const statusLabel: Record<string, string> = {
  active: 'Active',
  blocked: 'Blocked',
  'at-risk': 'At risk',
  hot: 'Hot',
  overdue: 'Overdue',
};

const REVIEWED_KEY = 'setuflow-dashboard-reviewed';
const SNOOZED_KEY = 'setuflow-dashboard-snoozed';

export function AttentionDetailDrawer({
  item,
  open,
  onClose,
  onMarkReviewed,
  onSnooze,
}: {
  item: AttentionItem | null;
  open: boolean;
  onClose: () => void;
  onMarkReviewed?: (itemId: string) => void;
  onSnooze?: (itemId: string) => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!item?.id) {
      setAcknowledged(false);
      return;
    }
    try {
      const reviewed = JSON.parse(window.localStorage.getItem(REVIEWED_KEY) || '{}');
      setAcknowledged(Boolean(reviewed[item.id]));
    } catch {
      setAcknowledged(false);
    }
  }, [item?.id, open]);

  const fallbackHref = useMemo(() => {
    if (!item?.leadId) return null;
    return `${PRODUCT_ROUTES.app.leads}?focus=${item.leadId}`;
  }, [item?.leadId]);

  if (!open || !item) return null;

  const primaryHref = item.ctaHref || fallbackHref;
  const primaryLabel = item.ctaHref ? item.ctaLabel : fallbackHref ? 'Open lead' : 'Mark reviewed';

  const persistReviewed = () => {
    try {
      const reviewed = JSON.parse(window.localStorage.getItem(REVIEWED_KEY) || '{}');
      reviewed[item.id] = { at: Date.now() };
      window.localStorage.setItem(REVIEWED_KEY, JSON.stringify(reviewed));
    } catch {}
    setAcknowledged(true);
    onMarkReviewed?.(item.id);
  };

  const persistSnooze = () => {
    try {
      const snoozed = JSON.parse(window.localStorage.getItem(SNOOZED_KEY) || '{}');
      snoozed[item.id] = { until: Date.now() + 86400000 };
      window.localStorage.setItem(SNOOZED_KEY, JSON.stringify(snoozed));
    } catch {}
    onSnooze?.(item.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-[1px]" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.18)]"
        onClick={(e) => e.stopPropagation()}
        aria-label="Action detail drawer"
      >
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Next action</p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.reason}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700" aria-label="Close action detail drawer">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Recommended move</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{item.ctaLabel ?? (fallbackHref ? 'Open the related record' : 'Review and close this item')}</p>
              </div>
              {acknowledged ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Reviewed</span> : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.leadType ? <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">{item.leadType === 'buyer' ? 'Buyer' : 'Supplier'}</span> : null}
              {item.productNames?.[0] ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">{item.productNames[0]}</span> : null}
              {item.statusTag ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">{statusLabel[item.statusTag] ?? item.statusTag}</span> : null}
              {item.stageName ? <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">{item.stageName}</span> : null}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Company</p><p className="mt-2 text-sm font-semibold text-slate-900">{item.companyName ?? 'Unassigned'}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Market</p><p className="mt-2 text-sm font-semibold text-slate-900">{item.marketCode ?? 'Global'}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Stage</p><p className="mt-2 text-sm font-semibold text-slate-900">{item.stageName ?? 'Open'}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Value impact</p><p className="mt-2 text-sm font-semibold text-slate-900">{typeof item.valueImpact === 'number' && item.valueImpact > 0 ? `$${Math.round(item.valueImpact).toLocaleString()}` : '—'}</p></div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Next actions</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li className="flex gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-[#1F487C]" />Check company, market, and stage.</li>
              <li className="flex gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-[#1F487C]" />Open the related record and continue the workflow.</li>
              <li className="flex gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-[#1F487C]" />Mark reviewed or snooze for tomorrow.</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {primaryHref ? (
              <Link href={primaryHref} className="rounded-xl bg-[#1F487C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#193769]">
                {primaryLabel}
              </Link>
            ) : (
              <button type="button" onClick={persistReviewed} className="rounded-xl bg-[#1F487C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#193769]">
                Mark reviewed
              </button>
            )}
            {fallbackHref && item.ctaHref ? (
              <Link href={fallbackHref} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Open lead
              </Link>
            ) : null}
            <button type="button" onClick={persistReviewed} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Mark reviewed</button>
            <button type="button" onClick={persistSnooze} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Snooze 24h</button>
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
