'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpDown,
  BarChart3,
  Building2,
  CalendarDays,
  Clock3,
  Eye,
  FileDown,
  FileSpreadsheet,
  FileText,
  Filter,
  Globe2,
  Search,
  Share2,
  Sparkles,
  Tag,
  Truck,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DashboardExportModal } from '@/components/dashboard/dashboard-export-modal';
import { GuruAvatar } from '@/components/ui/guru-avatar';
import type { ReportsData } from '@/lib/queries/reports';
import { isWorkflowOpenStatus } from '@/lib/reporting/summary-metrics';

type RangeKey = '30d' | '60d' | '90d';
type ReportType =
  | 'all'
  | 'pipeline'
  | 'quote-aging'
  | 'product-demand'
  | 'market-performance'
  | 'buyer-follow-up'
  | 'orders-execution'
  | 'trade-event-roi'
  | 'price-margin'
  | 'buyer-account';
type ReportKey = Exclude<ReportType, 'all'>;
type ScrollTarget = 'report-cards' | 'active-report';
type SortDirection = 'asc' | 'desc';
type ReportRow = Record<string, string | number>;
type LooseRow = Record<string, unknown>;
type ReportCard = { title: string; body: string; type: ReportKey; icon: LucideIcon; tone: string };

const RANGE_LABELS: Record<RangeKey, string> = {
  '30d': 'May 1 - May 31, 2025',
  '60d': 'Last 60 Days',
  '90d': 'Last 90 Days',
};

const TYPE_LABELS: Record<ReportType, string> = {
  all: 'All',
  pipeline: 'Sales Pipeline',
  'quote-aging': 'Quote Aging',
  'product-demand': 'Product Demand',
  'market-performance': 'Market Performance',
  'buyer-follow-up': 'Buyer Follow-up',
  'orders-execution': 'Orders & Execution',
  'trade-event-roi': 'Trade Event ROI',
  'price-margin': 'Price / Margin',
  'buyer-account': 'Buyer Account',
};

const REPORTS: ReportCard[] = [
  { title: 'Sales Pipeline Report', body: 'Pipeline value, stage health, and conversion by market.', type: 'pipeline', icon: Filter, tone: 'blue' },
  { title: 'Quote Aging Report', body: 'Pending quotes by buyer, age bucket, and recommended next action.', type: 'quote-aging', icon: Clock3, tone: 'orange' },
  { title: 'Product Demand Report', body: 'Demanded products, quote concentration, and buyer interest.', type: 'product-demand', icon: BarChart3, tone: 'green' },
  { title: 'Market Performance Report', body: 'Market coverage, active buyers, pipeline, orders, and revenue.', type: 'market-performance', icon: Globe2, tone: 'purple' },
  { title: 'Buyer Follow-up Report', body: 'Follow-up activity, due dates, response gaps, and buyer priority.', type: 'buyer-follow-up', icon: Users, tone: 'blue' },
  { title: 'Orders & Execution Report', body: 'Execution state, fulfillment timeline, and delivery visibility.', type: 'orders-execution', icon: Truck, tone: 'teal' },
  { title: 'Trade Event ROI Report', body: 'Trade show leads, influenced pipeline, and follow-up quality.', type: 'trade-event-roi', icon: CalendarDays, tone: 'purple' },
  { title: 'Price / Margin Report', body: 'Selling price, COGS signals, and margin pressure by product.', type: 'price-margin', icon: Tag, tone: 'orange' },
  { title: 'Buyer Account Report', body: 'Buyer activity, quotes, orders, and spend by account.', type: 'buyer-account', icon: Building2, tone: 'teal' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function row(value: unknown): LooseRow {
  return value as LooseRow;
}

function text(value: unknown, fallback = 'Not specified') {
  return String(value ?? '').trim() || fallback;
}

function fmt(value: number) {
  return value.toLocaleString('en-US');
}

function money(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${Math.round(value)}`;
}

function inRange(value: string | null | undefined, range: RangeKey) {
  const time = new Date(value ?? '').getTime();
  if (!Number.isFinite(time)) return true;
  const days = range === '90d' ? 90 : range === '60d' ? 60 : 30;
  return Date.now() - time <= days * DAY_MS;
}

function age(value: string | null | undefined) {
  const time = new Date(value ?? '').getTime();
  return Number.isFinite(time) ? Math.max(0, Math.round((Date.now() - time) / DAY_MS)) : 0;
}

function humanize(value: unknown) {
  const raw = text(value, 'Open');
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function quoteAction(status: unknown, days: number) {
  const normalized = text(status, '').toLowerCase();
  if (normalized === 'accepted') return 'Prepare order handoff';
  if (normalized === 'rejected') return 'Review loss reason';
  if (days >= 14) return 'Escalate buyer follow-up';
  if (days >= 7) return 'Send follow-up reminder';
  return 'Monitor buyer response';
}

function leadName(lead?: ReportsData['leads'][number]) {
  const raw = row(lead ?? {});
  return text(raw.company_name ?? raw.contact_name, 'Unassigned buyer');
}

function leadMarket(lead: ReportsData['leads'][number]) {
  const raw = row(lead);
  return text(raw.country ?? raw.market ?? raw.company_country, 'Unknown market');
}

function productName(product?: ReportsData['products'][number] | LooseRow | null) {
  const raw = row(product ?? {});
  return text(raw.name ?? raw.product_name ?? raw.description, 'Product');
}

function downloadCsv(rows: ReportRow[], fileName: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((item) => headers.map((key) => `"${String(item[key] ?? '').replaceAll('"', '""')}"`).join(',')),
  ].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function compareCell(a: string | number, b: string | number) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const aNumber = Number(String(a).replace(/[^0-9.-]/g, ''));
  const bNumber = Number(String(b).replace(/[^0-9.-]/g, ''));
  if (Number.isFinite(aNumber) && Number.isFinite(bNumber) && String(a).match(/\d/) && String(b).match(/\d/)) return aNumber - bNumber;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

function buildRows(type: ReportKey, data: ReportsData, range: RangeKey, market: string): ReportRow[] {
  const leads = data.leads
    .filter((lead) => inRange(row(lead).updated_at as string | null | undefined, range))
    .filter((lead) => market === 'all' || leadMarket(lead) === market);
  const leadIds = new Set(leads.map((lead) => lead.id));
  const leadById = new Map(data.leads.map((lead) => [lead.id, lead]));
  const productById = new Map(data.products.map((product) => [product.id, product]));
  const stageById = new Map(data.stages.map((stage) => [stage.id, stage.name]));
  const quotes = data.quotes
    .filter((quote) => !quote.lead_id || leadIds.has(quote.lead_id))
    .filter((quote) => inRange(quote.updated_at ?? quote.created_at, range));
  const followUps = data.followUps
    .filter((item) => !item.lead_id || leadIds.has(item.lead_id))
    .filter((item) => inRange(item.scheduled_at ?? item.created_at, range));

  if (type === 'quote-aging') {
    return quotes.slice(0, 40).map((quote) => {
      const days = age(quote.updated_at ?? quote.created_at);
      return {
        Buyer: quote.lead_id ? leadName(leadById.get(quote.lead_id)) : 'No buyer assigned',
        'Quote Stage': humanize(quote.status),
        'Days Waiting': days,
        'Recommended Action': quoteAction(quote.status, days),
      };
    });
  }

  if (type === 'buyer-follow-up') {
    return followUps.slice(0, 40).map((item) => ({
      Buyer: item.lead_id ? leadName(leadById.get(item.lead_id)) : 'No buyer assigned',
      Status: humanize(item.status),
      'Follow-up Due': text(item.scheduled_at, 'No date'),
      'Next Action': text(row(item).notes, 'Review buyer notes'),
    }));
  }

  if (type === 'product-demand') {
    return data.quoteLineItems.slice(0, 40).map((item) => {
      const raw = row(item);
      const product = raw.product_id ? productById.get(String(raw.product_id)) : null;
      return {
        Product: productName(product ?? raw),
        Quantity: Number(raw.quantity ?? 0),
        'Quoted Value': money(Number(raw.line_total ?? raw.total_price ?? raw.unit_price ?? 0)),
      };
    });
  }

  if (type === 'market-performance') {
    const map = new Map<string, { buyers: number; value: number }>();
    leads.forEach((lead) => {
      const key = leadMarket(lead);
      const current = map.get(key) ?? { buyers: 0, value: 0 };
      current.buyers += 1;
      current.value += Number(row(lead).deal_value ?? 0);
      map.set(key, current);
    });
    return Array.from(map.entries()).map(([name, item]) => ({ Market: name, Buyers: item.buyers, Pipeline: money(item.value) }));
  }

  if (type === 'orders-execution') {
    return leads.slice(0, 40).map((lead) => ({
      Buyer: leadName(lead),
      Market: leadMarket(lead),
      Stage: text(stageById.get(String(row(lead).stage_id)), 'Open'),
      Pipeline: money(Number(row(lead).deal_value ?? 0)),
    }));
  }

  if (type === 'price-margin') {
    return data.products.slice(0, 40).map((product) => ({
      Product: productName(product),
      SKU: text(row(product).sku, '-'),
      Status: row(product).is_active === false ? 'Inactive' : 'Active',
      Market: market === 'all' ? 'All markets' : market,
    }));
  }

  if (type === 'buyer-account') {
    return leads.slice(0, 40).map((lead) => ({
      Buyer: leadName(lead),
      Contact: text(row(lead).contact_name, '-'),
      Market: leadMarket(lead),
      Pipeline: money(Number(row(lead).deal_value ?? 0)),
    }));
  }

  if (type === 'trade-event-roi') {
    return leads
      .filter((lead) => Boolean(row(lead).trade_event_id || row(lead).trade_show_name))
      .slice(0, 40)
      .map((lead) => ({
        Event: text(row(lead).trade_show_name, 'Trade event'),
        Buyer: leadName(lead),
        Pipeline: money(Number(row(lead).deal_value ?? 0)),
        Market: leadMarket(lead),
      }));
  }

  return leads.slice(0, 40).map((lead) => ({
    Buyer: leadName(lead),
    Contact: text(row(lead).contact_name, '-'),
    Market: leadMarket(lead),
    Pipeline: money(Number(row(lead).deal_value ?? 0)),
    Updated: text(row(lead).updated_at, '-'),
  }));
}

function Metric({ label, value, helper, Icon }: { label: string; value: string | number; helper: string; Icon: LucideIcon }) {
  return (
    <article className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.045)]">
      <div className="flex items-center gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-600"><Icon className="h-6 w-6" /></span>
        <div>
          <p className="text-sm font-medium text-slate-700">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-medium text-emerald-600">{helper}</p>
        </div>
      </div>
    </article>
  );
}

function ReportCards({ cards, selected, onOpen }: { cards: ReportCard[]; selected: ReportKey | null; onOpen: (type: ReportKey) => void }) {
  return (
    <section id="report-cards" className="scroll-mt-24 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.type}
            type="button"
            onClick={() => onOpen(card.type)}
            className={`rounded-[1.35rem] border bg-white p-5 text-left shadow-[0_12px_28px_rgba(15,23,42,0.045)] transition hover:-translate-y-0.5 ${selected === card.type ? 'border-blue-300 ring-2 ring-blue-50' : 'border-slate-200'}`}
          >
            <div className="flex gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Icon className="h-5 w-5" /></span>
              <div>
                <h3 className="text-base font-semibold text-slate-950">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.body}</p>
                <span className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800"><Eye className="h-4 w-4" />Open report</span>
              </div>
            </div>
          </button>
        );
      })}
    </section>
  );
}

function Preview({ type, rows, onBack }: { type: ReportKey; rows: ReportRow[]; onBack: () => void }) {
  const headers = rows[0] ? Object.keys(rows[0]) : ['No data'];
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState(headers[0] ?? '');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const activeSortKey = headers.includes(sortKey) ? sortKey : headers[0];
  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? rows.filter((item) => Object.values(item).some((value) => String(value).toLowerCase().includes(normalizedQuery)))
      : rows;
    return [...filtered].sort((a, b) => {
      const result = compareCell(a[activeSortKey] ?? '', b[activeSortKey] ?? '');
      return sortDirection === 'asc' ? result : -result;
    });
  }, [activeSortKey, query, rows, sortDirection]);

  useEffect(() => {
    if (!headers.includes(sortKey)) setSortKey(headers[0] ?? '');
  }, [headers, sortKey]);

  return (
    <section id="active-report" className="scroll-mt-28 rounded-[1.45rem] border border-blue-100 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Active report</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">{TYPE_LABELS[type]} Report Preview</h2>
          <p className="text-sm text-slate-500">Clean buyer-facing rows generated from the selected report, market, and date filters.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onBack} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back to report cards</button>
          <button type="button" onClick={() => downloadCsv(visibleRows, `setu-flow-${type}.csv`)} className="inline-flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"><FileSpreadsheet className="h-4 w-4" />Export Excel</button>
          <button type="button" onClick={() => downloadCsv(visibleRows, `setu-flow-${type}-pdf-ready.csv`)} className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"><FileDown className="h-4 w-4" />PDF data</button>
        </div>
      </div>
      <div className="mb-4 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 lg:grid-cols-[1fr_auto_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter this report by buyer, market, stage, action..." className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100" />
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
          <ArrowUpDown className="h-4 w-4 text-slate-400" />
          <select value={activeSortKey} onChange={(event) => setSortKey(event.target.value)} className="h-10 bg-transparent outline-none">
            {headers.map((header) => <option key={header} value={header}>Sort: {header}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => setSortDirection((value) => (value === 'asc' ? 'desc' : 'asc'))} className="rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full divide-y divide-slate-100">
          <thead>
            <tr>{headers.map((key) => <th key={key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{key}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRows.length ? visibleRows.map((item, index) => (
              <tr key={index}>{headers.map((key) => <td key={key} className="px-4 py-3 text-sm text-slate-700">{item[key]}</td>)}</tr>
            )) : (
              <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-sm text-slate-400">No matching report rows for these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ReportsWorkspace({ data, readOnlyMessage }: { data: ReportsData; readOnlyMessage?: string | null }) {
  const [range, setRange] = useState<RangeKey>('30d');
  const [market, setMarket] = useState('all');
  const [reportType, setReportType] = useState<ReportType>('all');
  const [selected, setSelected] = useState<ReportKey | null>(null);
  const [scrollTarget, setScrollTarget] = useState<ScrollTarget | null>(null);
  const now = Date.now();

  const markets = useMemo(() => ['all', ...Array.from(new Set(data.leads.map((lead) => leadMarket(lead)).filter(Boolean))).slice(0, 12)], [data.leads]);
  const cards = reportType === 'all' ? REPORTS : REPORTS.filter((item) => item.type === reportType);
  const rows = useMemo(() => (selected ? buildRows(selected, data, range, market) : []), [selected, data, range, market]);
  const openQuotes = data.quotes.filter((quote) => isWorkflowOpenStatus(quote.status) && inRange(quote.updated_at ?? quote.created_at, range));
  const overdue = data.followUps.filter((item) => item.scheduled_at && isWorkflowOpenStatus(item.status) && new Date(item.scheduled_at).getTime() < now && inRange(item.scheduled_at, range));

  useEffect(() => {
    if (!scrollTarget) return undefined;
    const frame = requestAnimationFrame(() => {
      document.getElementById(scrollTarget)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setScrollTarget(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [rows.length, scrollTarget, selected]);

  const openReport = (type: ReportKey) => {
    setSelected(type);
    setScrollTarget('active-report');
  };

  return (
    <main className="space-y-6 text-slate-900">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">Reports</h1>
          <p className="mt-1 text-sm text-slate-600">Clean business reports for owners, sales teams, and trade follow-ups.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {(['30d', '60d', '90d'] as const).map((item) => (
              <button key={item} type="button" onClick={() => setRange(item)} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${range === item ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{RANGE_LABELS[item]}</button>
            ))}
          </div>
          <select value={market} onChange={(event) => setMarket(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm">
            {markets.map((item) => <option key={item} value={item}>{item === 'all' ? 'Market: All' : item}</option>)}
          </select>
          <select value={reportType} onChange={(event) => setReportType(event.target.value as ReportType)} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm">
            {Object.entries(TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{`Report Type: ${label}`}</option>)}
          </select>
          <DashboardExportModal active="reports" tone="teal" label="Export" />
        </div>
      </section>

      {readOnlyMessage ? <section className="rounded-[1.35rem] border border-blue-100 bg-blue-50/70 p-4 text-sm font-medium text-blue-800">{readOnlyMessage}</section> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Reports Generated" value={fmt(Math.max(3, (selected ? rows.length : 0) + openQuotes.length))} helper="live filtered scope" Icon={FileText} />
        <Metric label="Open Quotes" value={fmt(openQuotes.length)} helper="active in scope" Icon={FileSpreadsheet} />
        <Metric label="Overdue Follow-ups" value={fmt(overdue.length)} helper="need attention" Icon={Clock3} />
        <Metric label="Markets Active" value={fmt(markets.length - 1)} helper="available filter options" Icon={Globe2} />
      </section>

      <ReportCards cards={cards} selected={selected} onOpen={openReport} />
      {selected ? <Preview type={selected} rows={rows} onBack={() => setScrollTarget('report-cards')} /> : null}

      <section className="grid gap-5 xl:grid-cols-[1fr_17rem]">
        <div className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.045)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950">Recently Generated Reports</h2>
            {selected ? <button type="button" onClick={() => downloadCsv(rows, `setu-flow-${selected}-${range}.csv`)} className="inline-flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><FileSpreadsheet className="h-3.5 w-3.5" />Export current preview</button> : null}
          </div>
          <div className="mt-4 grid gap-3">
            {REPORTS.slice(0, 3).map((item) => (
              <div key={item.type} className="grid gap-3 rounded-2xl border border-slate-100 px-4 py-3 text-sm hover:bg-slate-50 md:grid-cols-[1fr_auto] md:items-center">
                <span className="font-semibold text-slate-900">{item.title} - {RANGE_LABELS[range]}</span>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => openReport(item.type)} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"><Eye className="h-3.5 w-3.5" />Open</button>
                  <button type="button" onClick={() => downloadCsv(buildRows(item.type, data, range, market), `setu-flow-${item.type}-${range}.csv`)} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><FileSpreadsheet className="h-3.5 w-3.5" />Excel</button>
                  <button type="button" onClick={() => downloadCsv(buildRows(item.type, data, range, market), `setu-flow-${item.type}-${range}-pdf-ready.csv`)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"><FileDown className="h-3.5 w-3.5" />PDF</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <aside className="rounded-[1.45rem] border border-slate-200 bg-white p-5 text-center shadow-[0_12px_28px_rgba(15,23,42,0.045)]">
          <p className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-950"><Sparkles className="h-4 w-4 text-blue-600" />Need help with reports?</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">Setu Guru can help you build custom reports and insights tailored to your export business.</p>
          <div className="mt-5 flex justify-center"><GuruAvatar size="lg" /></div>
          <Link href="/setu-guru" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-cyan-700 px-4 py-3 text-sm font-semibold text-white"><Sparkles className="h-4 w-4" />Chat with Setu Guru</Link>
        </aside>
      </section>
    </main>
  );
}
