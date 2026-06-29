'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Building2,
  CalendarDays,
  ChevronDown,
  Clock3,
  FileSpreadsheet,
  FileText,
  Filter,
  Globe2,
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

type Tone = 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'red';
type RangeKey = '30d' | '60d' | '90d';
type ReportType = 'all' | 'pipeline' | 'quote-aging' | 'product-demand' | 'market-performance' | 'buyer-follow-up' | 'orders-execution' | 'trade-event-roi' | 'price-margin' | 'buyer-account';
type ReportRow = Record<string, string | number>;
type LooseRow = Record<string, unknown>;
type ReportCard = { title: string; description: string; Icon: LucideIcon; tone: Tone; type: Exclude<ReportType, 'all'> };

const REPORT_CARDS: ReportCard[] = [
  { title: 'Sales Pipeline Report', description: 'Pipeline value, stage health, and conversion by market.', Icon: Filter, tone: 'blue', type: 'pipeline' },
  { title: 'Quote Aging Report', description: 'Pending quotes by age bucket, buyer response, and next action.', Icon: Clock3, tone: 'orange', type: 'quote-aging' },
  { title: 'Product Demand Report', description: 'Demanded products, quote concentration, and buyer interest.', Icon: BarChart3, tone: 'green', type: 'product-demand' },
  { title: 'Market Performance Report', description: 'Market coverage, active buyers, pipeline, orders, and revenue.', Icon: Globe2, tone: 'purple', type: 'market-performance' },
  { title: 'Buyer Follow-up Report', description: 'Follow-up activity, due dates, response gaps, and buyer priority.', Icon: Users, tone: 'blue', type: 'buyer-follow-up' },
  { title: 'Orders & Execution Report', description: 'Execution state, fulfillment timeline, and delivery visibility.', Icon: Truck, tone: 'teal', type: 'orders-execution' },
  { title: 'Trade Event ROI Report', description: 'Trade show leads, influenced pipeline, and follow-up quality.', Icon: CalendarDays, tone: 'purple', type: 'trade-event-roi' },
  { title: 'Price / Margin Report', description: 'Selling price, COGS signals, and margin pressure by product.', Icon: Tag, tone: 'orange', type: 'price-margin' },
  { title: 'Buyer Account Report', description: 'Buyer activity, quotes, orders, and spend by account.', Icon: Building2, tone: 'teal', type: 'buyer-account' },
];

const toneClasses: Record<Tone, { icon: string; text: string; pill: string; border: string }> = {
  blue: { icon: 'bg-blue-50 text-blue-600', text: 'text-blue-600', pill: 'bg-blue-50 text-blue-700 border-blue-100', border: 'border-blue-200' },
  green: { icon: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-600', pill: 'bg-emerald-50 text-emerald-700 border-emerald-100', border: 'border-emerald-200' },
  orange: { icon: 'bg-orange-50 text-orange-600', text: 'text-orange-600', pill: 'bg-orange-50 text-orange-700 border-orange-100', border: 'border-orange-200' },
  purple: { icon: 'bg-violet-50 text-violet-600', text: 'text-violet-600', pill: 'bg-violet-50 text-violet-700 border-violet-100', border: 'border-violet-200' },
  teal: { icon: 'bg-teal-50 text-teal-600', text: 'text-teal-600', pill: 'bg-teal-50 text-teal-700 border-teal-100', border: 'border-teal-200' },
  red: { icon: 'bg-red-50 text-red-600', text: 'text-red-600', pill: 'bg-red-50 text-red-700 border-red-100', border: 'border-red-200' },
};

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_LABELS: Record<RangeKey, string> = { '30d': 'May 1 - May 31, 2025', '60d': 'Last 60 Days', '90d': 'Last 90 Days' };
const TYPE_LABELS: Record<ReportType, string> = { all: 'All', pipeline: 'Sales Pipeline', 'quote-aging': 'Quote Aging', 'product-demand': 'Product Demand', 'market-performance': 'Market Performance', 'buyer-follow-up': 'Buyer Follow-up', 'orders-execution': 'Orders & Execution', 'trade-event-roi': 'Trade Event ROI', 'price-margin': 'Price / Margin', 'buyer-account': 'Buyer Account' };

function fmt(value: number) { return value.toLocaleString('en-US'); }
function money(value: number) { if (value >= 1000000) return `$${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`; if (value >= 1000) return `$${Math.round(value / 1000)}K`; return `$${Math.round(value)}`; }
function ageDays(value: string | null | undefined) { const time = new Date(value ?? '').getTime(); return Number.isFinite(time) ? Math.max(0, Math.round((Date.now() - time) / DAY_MS)) : null; }
function inRange(value: string | null | undefined, range: RangeKey) { const time = new Date(value ?? '').getTime(); if (!Number.isFinite(time)) return true; const days = range === '90d' ? 90 : range === '60d' ? 60 : 30; return Date.now() - time <= days * DAY_MS; }
function safeName(value: unknown, fallback = 'Not specified') { return String(value ?? '').trim() || fallback; }
function asRow(value: unknown): LooseRow { return value as LooseRow; }
function leadMarket(lead: ReportsData['leads'][number]) { const raw = asRow(lead); return safeName(raw.country ?? raw.market ?? raw.company_country, 'Unknown market'); }
function leadName(lead: ReportsData['leads'][number]) { const raw = asRow(lead); return safeName(raw.company_name ?? raw.contact_name, 'Unassigned buyer'); }
function productName(product: LooseRow) { return safeName(product.name ?? product.product_name ?? product.description, 'Product'); }

function downloadCsv(rows: ReportRow[], fileName: string) {
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

function Menu({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return <details className="group relative"><summary className="inline-flex h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"><Icon className="h-4 w-4 text-slate-600" />{label}<ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" /></summary><div className="absolute right-0 z-20 mt-2 min-w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">{children}</div></details>;
}
function MenuButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) { return <button type="button" onClick={onClick} className={`block w-full rounded-xl px-3 py-2 text-left text-sm font-medium ${active ? 'bg-slate-950 text-white' : 'text-slate-700 hover:bg-slate-50'}`}>{children}</button>; }
function MetricCard({ label, value, helper, Icon, tone }: { label: string; value: string | number; helper: string; Icon: LucideIcon; tone: Tone }) { const classes = toneClasses[tone]; return <article className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.045)]"><div className="flex items-center gap-4"><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${classes.icon}`}><Icon className="h-6 w-6" strokeWidth={2} /></span><div className="min-w-0"><p className="text-sm font-medium text-slate-700">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{value}</p><p className={`mt-1 text-xs font-medium ${classes.text}`}>{helper}</p></div></div></article>; }
function ReportLibraryCard({ item, active, onSelect }: { item: ReportCard; active: boolean; onSelect: () => void }) { const classes = toneClasses[item.tone]; const Icon = item.Icon; return <button type="button" onClick={onSelect} className={`group rounded-[1.35rem] border bg-white p-5 text-left shadow-[0_12px_28px_rgba(15,23,42,0.045)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(15,23,42,0.07)] ${active ? `${classes.border} ring-2 ring-blue-50` : 'border-slate-200'}`}><div className="flex gap-4"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${classes.icon}`}><Icon className="h-5 w-5" strokeWidth={2} /></span><div className="min-w-0"><h3 className="text-base font-semibold text-slate-950">{item.title}</h3><p className="mt-2 min-h-[2.75rem] text-sm leading-6 text-slate-600">{item.description}</p><span className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition group-hover:border-slate-300 group-hover:bg-slate-50">Open report <span>-></span></span></div></div></button>; }

function buildReportRows(type: ReportType, data: ReportsData, range: RangeKey, market: string): ReportRow[] {
  const leads = data.leads.filter((lead) => inRange(asRow(lead).updated_at as string | null | undefined, range)).filter((lead) => market === 'all' || leadMarket(lead) === market);
  const leadIds = new Set(leads.map((lead) => lead.id));
  const leadById = new Map(data.leads.map((lead) => [lead.id, lead]));
  const productById = new Map(data.products.map((product) => [product.id, product]));
  const quotes = data.quotes.filter((quote) => !quote.lead_id || leadIds.has(quote.lead_id)).filter((quote) => inRange(quote.updated_at ?? quote.created_at, range));
  const followUps = data.followUps.filter((item) => !item.lead_id || leadIds.has(item.lead_id)).filter((item) => inRange(item.scheduled_at ?? item.created_at, range));

  if (type === 'quote-aging') return quotes.slice(0, 20).map((quote) => ({ Quote: safeName(asRow(quote).quote_number, quote.id.slice(0, 8)), Buyer: quote.lead_id ? leadName(leadById.get(quote.lead_id) ?? ({} as ReportsData['leads'][number])) : 'No buyer', Status: safeName(quote.status), AgeDays: ageDays(quote.updated_at ?? quote.created_at) ?? 0 }));
  if (type === 'buyer-follow-up') return followUps.slice(0, 20).map((item) => ({ Buyer: item.lead_id ? leadName(leadById.get(item.lead_id) ?? ({} as ReportsData['leads'][number])) : 'No buyer', Status: safeName(item.status), Scheduled: safeName(item.scheduled_at, 'No date'), Notes: safeName(asRow(item).notes, '-') }));
  if (type === 'market-performance') { const byMarket = new Map<string, { leads: number; value: number }>(); leads.forEach((lead) => { const key = leadMarket(lead); const current = byMarket.get(key) ?? { leads: 0, value: 0 }; current.leads += 1; current.value += Number(asRow(lead).deal_value ?? 0); byMarket.set(key, current); }); return Array.from(byMarket.entries()).map(([name, row]) => ({ Market: name, Buyers: row.leads, Pipeline: money(row.value) })); }
  if (type === 'product-demand') return data.quoteLineItems.slice(0, 20).map((item) => { const row = asRow(item); const product = row.product_id ? productById.get(String(row.product_id)) : null; return { Product: product ? productName(asRow(product)) : safeName(row.product_name ?? row.description, 'Quoted product'), Quantity: Number(row.quantity ?? 0), Value: money(Number(row.line_total ?? row.total_price ?? row.unit_price ?? 0)) }; });
  if (type === 'orders-execution') return leads.slice(0, 20).map((lead) => ({ Buyer: leadName(lead), Market: leadMarket(lead), Stage: safeName(asRow(lead).stage_id, 'Open'), Pipeline: money(Number(asRow(lead).deal_value ?? 0)), Updated: safeName(asRow(lead).updated_at, '-') }));
  if (type === 'price-margin') return data.products.slice(0, 20).map((product) => ({ Product: productName(asRow(product)), SKU: safeName(asRow(product).sku, '-'), Status: asRow(product).is_active === false ? 'Inactive' : 'Active', Market: market === 'all' ? 'All markets' : market }));
  if (type === 'buyer-account') return leads.slice(0, 20).map((lead) => ({ Buyer: leadName(lead), Contact: safeName(asRow(lead).contact_name, '-'), Market: leadMarket(lead), Pipeline: money(Number(asRow(lead).deal_value ?? 0)) }));
  if (type === 'trade-event-roi') return leads.filter((lead) => Boolean(asRow(lead).trade_event_id || asRow(lead).trade_show_name)).slice(0, 20).map((lead) => ({ Event: safeName(asRow(lead).trade_show_name, 'Trade event'), Buyer: leadName(lead), Pipeline: money(Number(asRow(lead).deal_value ?? 0)), Market: leadMarket(lead) }));
  return leads.slice(0, 20).map((lead) => ({ Buyer: leadName(lead), Contact: safeName(asRow(lead).contact_name, '-'), Market: leadMarket(lead), Pipeline: money(Number(asRow(lead).deal_value ?? 0)), Updated: safeName(asRow(lead).updated_at, '-') }));
}

function ReportPreview({ type, rows, onExport }: { type: ReportType; rows: ReportRow[]; onExport: () => void }) { const headers = rows[0] ? Object.keys(rows[0]) : ['No data']; return <section className="rounded-[1.45rem] border border-blue-100 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.055)]"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Active report</p><h2 className="mt-1 text-xl font-semibold text-slate-950">{TYPE_LABELS[type]} Report Preview</h2><p className="text-sm text-slate-500">Live rows generated from the selected report, market, and date filters.</p></div><button type="button" onClick={onExport} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-cyan-700 px-4 py-2 text-sm font-semibold text-white"><FileSpreadsheet className="h-4 w-4" /> Export CSV</button></div><div className="overflow-x-auto"><table className="min-w-[760px] w-full divide-y divide-slate-100"><thead><tr>{headers.map((key) => <th key={key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{key}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.length ? rows.map((row, index) => <tr key={index}>{headers.map((key) => <td key={key} className="px-4 py-3 text-sm text-slate-700">{row[key]}</td>)}</tr>) : <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-sm text-slate-400">No matching report rows for these filters.</td></tr>}</tbody></table></div></section>; }

export function ReportsWorkspace({ data, readOnlyMessage }: { data: ReportsData; readOnlyMessage?: string | null }) {
  const [dateRange, setDateRange] = useState<RangeKey>('30d');
  const [market, setMarket] = useState('all');
  const [reportType, setReportType] = useState<ReportType>('all');
  const [selectedReport, setSelectedReport] = useState<ReportType>('pipeline');
  const now = Date.now();
  const marketOptions = useMemo(() => ['all', ...Array.from(new Set(data.leads.map((lead) => leadMarket(lead)).filter(Boolean))).slice(0, 12)], [data.leads]);
  const visibleCards = reportType === 'all' ? REPORT_CARDS : REPORT_CARDS.filter((item) => item.type === reportType);
  const activeRows = useMemo(() => buildReportRows(selectedReport, data, dateRange, market), [data, dateRange, market, selectedReport]);
  const reportData = useMemo(() => { const openQuotes = data.quotes.filter((quote) => isWorkflowOpenStatus(quote.status) && inRange(quote.updated_at ?? quote.created_at, dateRange)); const overdueFollowUps = data.followUps.filter((item) => item.scheduled_at && isWorkflowOpenStatus(item.status) && new Date(item.scheduled_at).getTime() < now && inRange(item.scheduled_at, dateRange)); const scopedLeads = data.leads.filter((lead) => market === 'all' || leadMarket(lead) === market); const pipelineValue = scopedLeads.reduce((sum, lead) => sum + Number(asRow(lead).deal_value ?? 0), 0); return { openQuotes, overdueFollowUps, activeMarkets: marketOptions.length - 1, generatedCount: Math.max(3, Math.min(99, activeRows.length + openQuotes.length)), pipelineValue }; }, [activeRows.length, data.followUps, data.leads, data.quotes, dateRange, market, marketOptions.length, now]);

  return <main className="space-y-6 text-slate-900"><section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">Reports</h1><p className="mt-1 text-sm text-slate-600">Clean business reports for owners, sales teams, and trade follow-ups.</p></div><div className="flex flex-wrap items-center gap-3"><div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">{(['30d', '60d', '90d'] as const).map((item) => <button key={item} type="button" onClick={() => setDateRange(item)} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${dateRange === item ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{RANGE_LABELS[item]}</button>)}</div><Menu icon={Globe2} label={`Market: ${market === 'all' ? 'All' : market}`}>{marketOptions.map((item) => <MenuButton key={item} active={market === item} onClick={() => setMarket(item)}>{item === 'all' ? 'All Markets' : item}</MenuButton>)}</Menu><Menu icon={Filter} label={`Report Type: ${TYPE_LABELS[reportType]}`}>{Object.entries(TYPE_LABELS).map(([key, label]) => <MenuButton key={key} active={reportType === key} onClick={() => setReportType(key as ReportType)}>{label}</MenuButton>)}</Menu><DashboardExportModal active="reports" tone="teal" label="Export" /></div></section>{readOnlyMessage ? <section className="rounded-[1.35rem] border border-blue-100 bg-blue-50/70 p-4 text-sm font-medium text-blue-800">{readOnlyMessage}</section> : null}<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><MetricCard label="Reports Generated" value={fmt(reportData.generatedCount)} helper="live filtered scope" Icon={FileText} tone="blue" /><MetricCard label="Open Quotes" value={fmt(reportData.openQuotes.length)} helper="active in scope" Icon={FileSpreadsheet} tone="green" /><MetricCard label="Overdue Follow-ups" value={fmt(reportData.overdueFollowUps.length)} helper="need attention" Icon={Clock3} tone="orange" /><MetricCard label="Markets Active" value={fmt(reportData.activeMarkets)} helper="available filter options" Icon={Globe2} tone="teal" /></section><ReportPreview type={selectedReport} rows={activeRows} onExport={() => downloadCsv(activeRows, `setu-flow-${selectedReport}-${dateRange}.csv`)} /><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{visibleCards.slice(0, 4).map((item) => <ReportLibraryCard key={item.title} item={item} active={selectedReport === item.type} onSelect={() => setSelectedReport(item.type)} />)}</section><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{visibleCards.slice(4).map((item) => <ReportLibraryCard key={item.title} item={item} active={selectedReport === item.type} onSelect={() => setSelectedReport(item.type)} />)}</section><section className="grid gap-5 xl:grid-cols-[1fr_17rem]"><div className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.045)]"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold text-slate-950">Recently Generated Reports</h2><p className="text-xs font-medium text-slate-500">Reports are available for 90 days. Download or export to keep a copy.</p></div><div className="mt-4 overflow-x-auto"><table className="min-w-[760px] w-full divide-y divide-slate-100"><thead><tr className="text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"><th className="px-4 py-3">Report Name</th><th className="px-4 py-3">Scope</th><th className="px-4 py-3">Generated On</th><th className="px-4 py-3">Quick Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{REPORT_CARDS.slice(0, 3).map((report) => { const Icon = report.Icon; return <tr key={report.title} className="align-middle transition hover:bg-slate-50/70"><td className="px-4 py-4 text-sm font-semibold text-slate-900"><span className={`mr-3 inline-flex rounded-lg border p-1.5 ${toneClasses[report.tone].pill}`}><Icon className="h-4 w-4" /></span>{report.title} - {RANGE_LABELS[dateRange]}</td><td className="px-4 py-4 text-sm text-slate-600">Market: {market === 'all' ? 'All' : market} - {TYPE_LABELS[report.type]}</td><td className="px-4 py-4 text-sm text-slate-600">Live preview</td><td className="px-4 py-4"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setSelectedReport(report.type)} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"><FileText className="h-3.5 w-3.5" />Open</button><button type="button" onClick={() => downloadCsv(buildReportRows(report.type, data, dateRange, market), `setu-flow-${report.type}-${dateRange}.csv`)} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><FileSpreadsheet className="h-3.5 w-3.5" />Excel</button><button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"><Share2 className="h-3.5 w-3.5" />Share</button></div></td></tr>; })}</tbody></table></div></div><aside className="rounded-[1.45rem] border border-slate-200 bg-white p-5 text-center shadow-[0_12px_28px_rgba(15,23,42,0.045)]"><p className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-950"><Sparkles className="h-4 w-4 text-blue-600" />Need help with reports?</p><p className="mt-3 text-sm leading-6 text-slate-600">Setu Guru can help you build custom reports and insights tailored to your export business.</p><div className="mt-5 flex justify-center"><GuruAvatar size="lg" /></div><Link href="/setu-guru" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-cyan-700 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(15,118,110,0.20)]"><Sparkles className="h-4 w-4" />Chat with Setu Guru</Link></aside></section></main>;
}
