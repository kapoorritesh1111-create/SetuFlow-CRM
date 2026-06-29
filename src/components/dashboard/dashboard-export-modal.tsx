'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download } from 'lucide-react';
import type { DashboardSectionTab } from './dashboard-section-tabs';

type ExportDataset = 'executive-summary' | 'pipeline-funnel' | 'markets' | 'products' | 'orders-execution' | 'audit-reporting' | 'business-pack';
type ExportRange = '7d' | '30d' | '90d' | 'quarter' | 'custom';
type TriggerTone = 'navy' | 'teal';

const DATASETS: Array<{ key: ExportDataset; label: string; helper: string }> = [
  { key: 'executive-summary', label: 'Executive summary', helper: 'Best one-page leadership snapshot across Home, Analytics, and Reports.' },
  { key: 'pipeline-funnel', label: 'Pipeline & funnel', helper: 'Lead, quote, order, win, and conversion movement.' },
  { key: 'markets', label: 'Markets', helper: 'Market coverage and country/region performance.' },
  { key: 'products', label: 'Products', helper: 'Product interest and quote concentration.' },
  { key: 'orders-execution', label: 'Orders / execution', helper: 'Execution state, dispatch, completion, and blockers.' },
  { key: 'audit-reporting', label: 'Audit / reporting', helper: 'Audit volume and governance-friendly reporting metrics.' },
  { key: 'business-pack', label: 'Full business pack', helper: 'All summarized business sections in one clean CSV.' },
];

const RANGES: Array<{ key: ExportRange; label: string }> = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'quarter', label: 'This quarter' },
  { key: 'custom', label: 'Custom' },
];

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoInputValue(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function DashboardExportModal({ active, tone = 'navy', label = 'Export' }: { active: DashboardSectionTab; tone?: TriggerTone; label?: string }) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [dataset, setDataset] = useState<ExportDataset>(active === 'reports' ? 'business-pack' : active === 'analytics' ? 'pipeline-funnel' : 'executive-summary');
  const [range, setRange] = useState<ExportRange>('30d');
  const [from, setFrom] = useState(daysAgoInputValue(30));
  const [to, setTo] = useState(todayInputValue());

  const mode = useMemo(() => {
    const value = searchParams.get('mode');
    if (value === 'buyers' || value === 'buyer') return 'buyers';
    if (value === 'suppliers' || value === 'supplier') return 'suppliers';
    return 'all';
  }, [searchParams]);

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set('source', active);
    params.set('dataset', dataset);
    params.set('mode', mode);
    params.set('range', range);
    if (range === 'custom') {
      params.set('from', from);
      params.set('to', to);
    }
    return `/api/dashboard/export?${params.toString()}`;
  }, [active, dataset, from, mode, range, to]);

  const triggerClass = tone === 'teal'
    ? 'inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-cyan-700 px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(15,118,110,0.22)] transition hover:from-teal-800 hover:to-cyan-800'
    : 'inline-flex items-center gap-2 rounded-2xl bg-[#082f49] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(8,47,73,0.18)] hover:bg-[#0b3b5c]';

  return (
    <div className="flex items-center justify-end">
      <button type="button" onClick={() => setOpen(true)} className={triggerClass}>
        <Download className="h-4 w-4" /> {label}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Export dashboard data">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[1.75rem] bg-white p-5 shadow-[0_28px_80px_rgba(15,23,42,0.25)]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Export</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950">Download clean business data</h2>
                <p className="mt-1 text-sm text-slate-500">Exports respect the current dashboard mode and selected time frame.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Close</button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
              <section>
                <h3 className="text-sm font-semibold text-slate-900">Choose data</h3>
                <div className="mt-3 grid gap-2">
                  {DATASETS.map((item) => (
                    <label key={item.key} className={`cursor-pointer rounded-2xl border px-4 py-3 transition ${dataset === item.key ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                      <input className="sr-only" type="radio" name="export-dataset" checked={dataset === item.key} onChange={() => setDataset(item.key)} />
                      <span className="block text-sm font-semibold text-slate-900">{item.label}</span>
                      <span className="mt-1 block text-xs font-medium text-slate-500">{item.helper}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Time frame</h3>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {RANGES.map((item) => (
                    <button key={item.key} type="button" onClick={() => setRange(item.key)} className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${range === item.key ? 'bg-[#082f49] text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                      {item.label}
                    </button>
                  ))}
                </div>
                {range === 'custom' ? (
                  <div className="mt-4 grid gap-3">
                    <label className="text-xs font-semibold text-slate-600">From
                      <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1" />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">To
                      <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1" />
                    </label>
                  </div>
                ) : null}
                <div className="mt-4 rounded-2xl bg-white p-3 text-xs font-medium text-slate-500">
                  <div>Source tab: <span className="font-semibold text-slate-800">{active}</span></div>
                  <div>Mode: <span className="font-semibold text-slate-800">{mode}</span></div>
                  <div>Format: <span className="font-semibold text-slate-800">CSV for Excel</span></div>
                </div>
              </section>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-white">
              <p className="text-sm font-medium text-white/78">The downloaded file starts with the applied filters, then exports clean business rows.</p>
              <a href={exportHref} onClick={() => setOpen(false)} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-blue-50">
                Download CSV
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
