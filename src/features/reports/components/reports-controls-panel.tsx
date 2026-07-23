'use client';

import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionCard } from '@/components/ui/section-card';
import type { ReportsData } from '@/lib/queries/reports';

type DateRangeKey = '7d' | '30d' | '90d' | 'quarter';
type DateRecord = { created_at?: string | null; updated_at?: string | null };

type CsvRow = {
  metric: string;
  value: number | string;
  dateRangeStart: string;
  dateRangeEnd: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const PRESETS: Array<{ key: DateRangeKey; label: string; days?: number }> = [
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
  { key: 'quarter', label: 'This quarter' },
];

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getQuarterStart(date: Date) {
  const quarterMonth = Math.floor(date.getMonth() / 3) * 3;
  return new Date(date.getFullYear(), quarterMonth, 1);
}

function getPresetRange(key: DateRangeKey) {
  const end = new Date();
  const preset = PRESETS.find((item) => item.key === key);
  const start = preset?.days ? new Date(end.getTime() - preset.days * DAY_MS) : getQuarterStart(end);
  return { from: toDateInputValue(start), to: toDateInputValue(end) };
}

function getRecordTime(record: DateRecord) {
  const value = record.created_at ?? record.updated_at ?? '';
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function inRange(record: DateRecord, from: string, to: string) {
  const time = getRecordTime(record);
  if (time === null) return false;
  const fromTime = new Date(`${from}T00:00:00.000Z`).getTime();
  const toTime = new Date(`${to}T23:59:59.999Z`).getTime();
  return time >= fromTime && time <= toTime;
}

function getWeekKey(record: DateRecord) {
  const time = getRecordTime(record);
  if (time === null) return 'Undated';
  const date = new Date(time);
  const firstDay = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - firstDay.getTime()) / DAY_MS + firstDay.getUTCDay() + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function downloadCsv(rows: CsvRow[]) {
  const headers: Array<keyof CsvRow> = ['metric', 'value', 'dateRangeStart', 'dateRangeEnd'];
  const escapeCell = (cell: string | number) => `"${String(cell).replaceAll('"', '""')}"`;
  const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `setuflow-report-${rows[0]?.dateRangeStart ?? 'filtered'}-to-${rows[0]?.dateRangeEnd ?? 'today'}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ReportsControlsPanel({ data }: { data: ReportsData }) {
  const initialRange = getPresetRange('30d');
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const wonStageIds = useMemo(() => new Set(data.stages.filter((stage) => stage.is_won).map((stage) => stage.id)), [data.stages]);

  const filtered = useMemo(() => {
    const leads = data.leads.filter((lead) => inRange(lead, from, to));
    const rfqs = data.rfqs.filter((rfq) => inRange(rfq, from, to));
    const quotes = data.quotes.filter((quote) => inRange(quote, from, to));
    const auditEvents = data.auditEvents.filter((event) => inRange(event, from, to));
    const wonLeads = leads.filter((lead) => lead.stage_id && wonStageIds.has(lead.stage_id));
    const quoteWeeks = new Map<string, number>();
    for (const quote of quotes) quoteWeeks.set(getWeekKey(quote), (quoteWeeks.get(getWeekKey(quote)) ?? 0) + 1);
    const quoteTrend = Array.from(quoteWeeks.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label, value }));
    const maxTrend = Math.max(1, ...quoteTrend.map((item) => item.value));
    return { leads, rfqs, quotes, auditEvents, wonLeads, quoteTrend, maxTrend };
  }, [data.auditEvents, data.leads, data.quotes, data.rfqs, from, to, wonStageIds]);

  const funnel = [
    { label: 'Leads', value: filtered.leads.length },
    { label: 'RFQs', value: filtered.rfqs.length },
    { label: 'Quotes', value: filtered.quotes.length },
    { label: 'Won leads', value: filtered.wonLeads.length },
  ];
  const maxFunnel = Math.max(1, ...funnel.map((item) => item.value));
  const csvRows: CsvRow[] = [
    { metric: 'Leads created', value: filtered.leads.length, dateRangeStart: from, dateRangeEnd: to },
    { metric: 'RFQs created', value: filtered.rfqs.length, dateRangeStart: from, dateRangeEnd: to },
    { metric: 'Quotes created', value: filtered.quotes.length, dateRangeStart: from, dateRangeEnd: to },
    { metric: 'Won leads touched', value: filtered.wonLeads.length, dateRangeStart: from, dateRangeEnd: to },
    { metric: 'Audit events', value: filtered.auditEvents.length, dateRangeStart: from, dateRangeEnd: to },
  ];

  return (
    <SectionCard>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Filtered export, quote trend, and conversion funnel</h2>
          <p className="mt-2 text-sm text-slate-600">Use presets or a custom date range to review created leads, RFQs, quotes, won movement, and audit volume.</p>
        </div>
        <button type="button" onClick={() => downloadCsv(csvRows)} className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
          Export CSV
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button key={preset.key} type="button" onClick={() => { const range = getPresetRange(preset.key); setFrom(range.from); setTo(range.to); }} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            {preset.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">From
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700" />
        </label>
        <label className="text-sm font-semibold text-slate-700">To
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700" />
        </label>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {csvRows.map((row) => (
          <div key={row.metric} className="rounded-2xl border border-blue-100 bg-blue-50/70 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-500">{row.metric}</p>
            <p className="mt-1 text-lg font-black text-slate-950">{row.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-hero border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-sm font-semibold text-slate-900">Quotes created per week</p>
          <div className="mt-4 space-y-3">
            {filtered.quoteTrend.length ? filtered.quoteTrend.map((item) => (
              <div key={item.label} className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-3 text-sm text-slate-600">
                <span>{item.label}</span>
                <span className="h-3 rounded-full bg-slate-200"><span className="block h-3 rounded-full bg-slate-900" style={{ width: `${Math.max(8, (item.value / filtered.maxTrend) * 100)}%` }} /></span>
                <span className="text-right font-semibold text-slate-900">{item.value}</span>
              </div>
            )) : <EmptyState title="No quote trend yet" description="Quotes created in the selected date range will appear here by week." />}
          </div>
        </div>

        <div className="rounded-hero border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-sm font-semibold text-slate-900">Conversion funnel</p>
          <div className="mt-4 space-y-3">
            {funnel.map((item) => (
              <div key={item.label} className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-3 text-sm text-slate-600">
                <span>{item.label}</span>
                <span className="h-3 rounded-full bg-slate-200"><span className="block h-3 rounded-full bg-slate-900" style={{ width: `${Math.max(8, (item.value / maxFunnel) * 100)}%` }} /></span>
                <span className="text-right font-semibold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
