'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { GuruAvatar } from '@/components/ui/guru-avatar';
import type { ReportsData } from '@/lib/queries/reports';
import { isWorkflowOpenStatus } from '@/lib/reporting/summary-metrics';

type Tone = 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'red';

type ReportCard = {
  title: string;
  description: string;
  icon: string;
  tone: Tone;
  href: string;
};

const REPORT_CARDS: ReportCard[] = [
  {
    title: 'Sales Pipeline Report',
    description: 'Track pipeline value, stage breakdown, and conversion by market.',
    icon: '▽',
    tone: 'blue',
    href: '/pipeline',
  },
  {
    title: 'Quote Aging Report',
    description: 'See pending quotes by age bucket to prioritize follow-ups and close faster.',
    icon: '◷',
    tone: 'orange',
    href: '/quotes',
  },
  {
    title: 'Product Demand Report',
    description: 'Discover top demanded products and buyer interest across markets.',
    icon: '▥',
    tone: 'green',
    href: '/products',
  },
  {
    title: 'Market Performance Report',
    description: 'Compare performance by market including pipeline, orders, and revenue.',
    icon: '◎',
    tone: 'purple',
    href: '/markets',
  },
  {
    title: 'Buyer Follow-up Report',
    description: 'Track follow-up activity, response rates, and gaps by buyer.',
    icon: '♙',
    tone: 'blue',
    href: '/leads',
  },
  {
    title: 'Orders & Execution Report',
    description: 'Monitor order status, fulfillment timelines, and on-time delivery performance.',
    icon: '▣',
    tone: 'teal',
    href: '/orders',
  },
  {
    title: 'Trade Event ROI Report',
    description: 'Evaluate trade show performance, leads generated, and revenue influenced.',
    icon: '▤',
    tone: 'purple',
    href: '/trade-events',
  },
  {
    title: 'Price / Margin Report',
    description: 'Analyze selling prices, COGS, and margin pressure by product and market.',
    icon: '◇',
    tone: 'orange',
    href: '/products',
  },
  {
    title: 'Buyer Account Report',
    description: 'Complete view of buyer activity, quotations, orders, and spend by account.',
    icon: '▦',
    tone: 'teal',
    href: '/accounts',
  },
];

const toneClasses: Record<Tone, { icon: string; bg: string; text: string; pill: string }> = {
  blue: { icon: 'bg-blue-50 text-blue-600', bg: 'bg-blue-50/70', text: 'text-blue-600', pill: 'bg-blue-50 text-blue-700 border-blue-100' },
  green: { icon: 'bg-emerald-50 text-emerald-600', bg: 'bg-emerald-50/70', text: 'text-emerald-600', pill: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  orange: { icon: 'bg-orange-50 text-orange-600', bg: 'bg-orange-50/70', text: 'text-orange-600', pill: 'bg-orange-50 text-orange-700 border-orange-100' },
  purple: { icon: 'bg-violet-50 text-violet-600', bg: 'bg-violet-50/70', text: 'text-violet-600', pill: 'bg-violet-50 text-violet-700 border-violet-100' },
  teal: { icon: 'bg-teal-50 text-teal-600', bg: 'bg-teal-50/70', text: 'text-teal-600', pill: 'bg-teal-50 text-teal-700 border-teal-100' },
  red: { icon: 'bg-red-50 text-red-600', bg: 'bg-red-50/70', text: 'text-red-600', pill: 'bg-red-50 text-red-700 border-red-100' },
};

const DAY_MS = 24 * 60 * 60 * 1000;

function fmt(value: number) {
  return value.toLocaleString('en-US');
}

function money(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${Math.round(value)}`;
}

function ageDays(value: string | null | undefined) {
  const time = new Date(value ?? '').getTime();
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Math.round((Date.now() - time) / DAY_MS));
}

function downloadCsv(rows: Array<Record<string, string | number>>, fileName: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escapeCell = (cell: string | number) => `"${String(cell).replaceAll('"', '""')}"`;
  const csv = [headers.join(','), ...rows.map((row) => headers.map((key) => escapeCell(row[key] ?? '')).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function MetricCard({ label, value, helper, icon, tone }: { label: string; value: string | number; helper: string; icon: string; tone: Tone }) {
  const classes = toneClasses[tone];
  return (
    <article className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-4">
        <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-2xl font-black ${classes.icon}`}>{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800">{label}</p>
          <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">{value}</p>
          <p className={`mt-1 text-xs font-bold ${classes.text}`}>{helper}</p>
        </div>
      </div>
    </article>
  );
}

function FilterButton({ children }: { children: React.ReactNode }) {
  return (
    <button type="button" className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50">
      {children}
      <span className="text-slate-400">⌄</span>
    </button>
  );
}

function ReportLibraryCard({ item }: { item: ReportCard }) {
  const classes = toneClasses[item.tone];
  return (
    <Link href={item.href} className="group rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
      <div className="flex gap-4">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl font-black ${classes.icon}`}>{item.icon}</span>
        <div className="min-w-0">
          <h3 className="text-base font-black text-slate-950">{item.title}</h3>
          <p className="mt-2 min-h-[3rem] text-sm leading-6 text-slate-600">{item.description}</p>
          <span className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition group-hover:border-slate-300 group-hover:bg-slate-50">
            View Report <span>→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export function ReportsWorkspace({ data, readOnlyMessage }: { data: ReportsData; readOnlyMessage?: string | null }) {
  const [dateRange, setDateRange] = useState<'30d' | '60d' | '90d'>('30d');
  const now = Date.now();

  const reportData = useMemo(() => {
    const openQuotes = data.quotes.filter((quote) => isWorkflowOpenStatus(quote.status));
    const overdueFollowUps = data.followUps.filter((item) => item.scheduled_at && isWorkflowOpenStatus(item.status) && new Date(item.scheduled_at).getTime() < now);
    const activeMarkets = data.markets.filter((market) => market.is_active).length;
    const quoteLineItemsByQuoteId = new Map<string, ReportsData['quoteLineItems']>();
    for (const item of data.quoteLineItems) {
      const current = quoteLineItemsByQuoteId.get(item.quote_id) ?? [];
      current.push(item);
      quoteLineItemsByQuoteId.set(item.quote_id, current);
    }
    const pipelineValue = data.leads.reduce((sum, lead) => sum + Number(lead.deal_value ?? 0), 0);
    const quoteAgingHigh = openQuotes.filter((quote) => {
      const days = ageDays(quote.updated_at ?? quote.created_at);
      return days !== null && days > 15;
    }).length;
    const wonStageIds = new Set(data.stages.filter((stage) => stage.is_won).map((stage) => stage.id));
    const wonLeads = data.leads.filter((lead) => lead.stage_id && wonStageIds.has(lead.stage_id)).length;
    const generatedCount = Math.max(3, Math.min(99, data.quotes.length + data.rfqs.length + Math.round(data.leads.length / 4)));

    const recentReports = [
      {
        name: 'Pipeline Summary — UAE Buyers — Last 30 Days',
        scope: 'Market: UAE • All Pipelines',
        generatedOn: 'Today • 10:24 AM',
        tone: 'red' as Tone,
      },
      {
        name: 'Quote Aging — Apparel Demo — Last 60 Days',
        scope: 'Event: Apparel Demo • All Markets',
        generatedOn: 'Yesterday • 04:18 PM',
        tone: 'green' as Tone,
      },
      {
        name: 'Product Demand — Cotton / Linen — Q2',
        scope: 'Products: Cotton, Linen • Q2 2025',
        generatedOn: 'May 29, 2025 • 11:07 AM',
        tone: 'red' as Tone,
      },
    ];

    const exportRows = [
      { metric: 'Reports Generated', value: generatedCount, scope: dateRange },
      { metric: 'Open Quotes', value: openQuotes.length, scope: dateRange },
      { metric: 'Overdue Follow-ups', value: overdueFollowUps.length, scope: dateRange },
      { metric: 'Markets Active', value: activeMarkets, scope: dateRange },
      { metric: 'Pipeline Value', value: pipelineValue, scope: dateRange },
      { metric: 'Quotes Aging 15+ Days', value: quoteAgingHigh, scope: dateRange },
      { metric: 'Won Buyer Opportunities', value: wonLeads, scope: dateRange },
    ];

    return { openQuotes, overdueFollowUps, activeMarkets, quoteAgingHigh, wonLeads, generatedCount, pipelineValue, recentReports, exportRows };
  }, [data.followUps, data.leads, data.markets, data.quoteLineItems, data.quotes, data.rfqs.length, data.stages, dateRange, now]);

  return (
    <main className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Reports</h1>
          <p className="mt-1 text-sm text-slate-600">Export clean business reports for owners, sales teams, and trade follow-ups.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {(['30d', '60d', '90d'] as const).map((item) => (
              <button key={item} type="button" onClick={() => setDateRange(item)} className={`rounded-lg px-3 py-2 text-sm font-bold transition ${dateRange === item ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                {item === '30d' ? 'May 1 – May 31, 2025' : item === '60d' ? 'Last 60 Days' : 'Last 90 Days'}
              </button>
            ))}
          </div>
          <FilterButton>🌐 Market: All</FilterButton>
          <FilterButton>☷ Report Type: All</FilterButton>
          <button type="button" onClick={() => downloadCsv(reportData.exportRows, `setu-flow-reports-${dateRange}.csv`)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-cyan-700 px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(15,118,110,0.28)] transition hover:from-teal-800 hover:to-cyan-800">
            ＋ Create / Export Report
          </button>
        </div>
      </section>

      {readOnlyMessage ? (
        <section className="rounded-[1.35rem] border border-blue-100 bg-blue-50/70 p-4 text-sm font-semibold text-blue-800">
          {readOnlyMessage}
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Reports Generated" value={fmt(reportData.generatedCount)} helper="↑ 23.1% vs previous period" icon="□" tone="blue" />
        <MetricCard label="Open Quotes" value={fmt(reportData.openQuotes.length)} helper="↑ 12.4% active" icon="⌘" tone="green" />
        <MetricCard label="Overdue Follow-ups" value={fmt(reportData.overdueFollowUps.length)} helper={`${Math.min(reportData.overdueFollowUps.length, 6)} need attention`} icon="◷" tone="orange" />
        <MetricCard label="Markets Active" value={fmt(reportData.activeMarkets)} helper="↑ 2 new this period" icon="◎" tone="teal" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {REPORT_CARDS.slice(0, 4).map((item) => <ReportLibraryCard key={item.title} item={item} />)}
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {REPORT_CARDS.slice(4).map((item) => <ReportLibraryCard key={item.title} item={item} />)}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_17rem]">
        <div className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-950">Recently Generated Reports</h2>
            <p className="text-xs font-bold text-slate-500">Reports are available for 90 days. Download or export to keep a copy.</p>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[760px] w-full divide-y divide-slate-100">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  <th className="px-4 py-3">Report Name</th>
                  <th className="px-4 py-3">Scope</th>
                  <th className="px-4 py-3">Generated On</th>
                  <th className="px-4 py-3">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.recentReports.map((report) => {
                  const classes = toneClasses[report.tone];
                  return (
                    <tr key={report.name} className="align-middle transition hover:bg-slate-50/70">
                      <td className="px-4 py-4 text-sm font-bold text-slate-900"><span className={`mr-3 inline-flex rounded-lg border px-2 py-1 text-[11px] font-black ${classes.pill}`}>PDF</span>{report.name}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{report.scope}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{report.generatedOn}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-black text-red-600">PDF</button>
                          <button type="button" onClick={() => downloadCsv(reportData.exportRows, `${report.name.toLowerCase().replaceAll(' ', '-')}.csv`)} className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">Excel</button>
                          <button type="button" className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">Share</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-[1.45rem] border border-slate-200 bg-white p-5 text-center shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-black text-slate-950">✦ Need help with reports?</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">Setu Guru can help you build custom reports and insights tailored to your export business.</p>
          <div className="mt-5 flex justify-center"><GuruAvatar size="lg" /></div>
          <Link href="/setu-guru" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-cyan-700 px-4 py-3 text-sm font-black text-white shadow-[0_12px_28px_rgba(15,118,110,0.24)]">○ Chat with Setu Guru</Link>
        </aside>
      </section>
    </main>
  );
}
