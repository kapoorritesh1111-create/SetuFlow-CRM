import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Download,
  Globe2,
  Info,
  Lightbulb,
  Mail,
  Package,
  Shirt,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getAnalyticsData } from '@/lib/queries/analytics';
import type { AnalyticsData } from '@/lib/queries/analytics';
import { hasSupabaseEnv } from '@/lib/env';
import { parseWorkspaceMode } from '@/features/workspace/mode';
import type { WorkspaceMode } from '@/features/workspace/types';

type Tone = 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'red';
type RangeKey = '30d' | '60d' | '90d';
type FunnelFocus = 'all' | 'rfq' | 'quote' | 'orders';
type SearchParams = { mode?: string | string[]; range?: string | string[]; market?: string | string[]; funnel?: string | string[] };

type PipelineMovementRow = { label: string; value: number; helper: string; tone: Tone };
type MarketRow = { name: string; value: number; pct: number; growth: number; code: string };
type ProductRow = { name: string; value: number; pct: number; quotes: number; Icon: LucideIcon; tone: Tone; imageUrl: string | null; topMarket: string | null };

const toneClasses: Record<Tone, { icon: string; bar: string; badge: string; text: string; soft: string }> = {
  blue: { icon: 'bg-blue-50 text-blue-600', bar: 'bg-blue-600', badge: 'bg-blue-50 text-blue-700 border-blue-100', text: 'text-blue-600', soft: 'bg-blue-50' },
  green: { icon: 'bg-emerald-50 text-emerald-600', bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100', text: 'text-emerald-600', soft: 'bg-emerald-50' },
  orange: { icon: 'bg-orange-50 text-orange-600', bar: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-100', text: 'text-orange-600', soft: 'bg-orange-50' },
  purple: { icon: 'bg-violet-50 text-violet-600', bar: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 border-violet-100', text: 'text-violet-600', soft: 'bg-violet-50' },
  teal: { icon: 'bg-teal-50 text-teal-600', bar: 'bg-teal-500', badge: 'bg-teal-50 text-teal-700 border-teal-100', text: 'text-teal-600', soft: 'bg-teal-50' },
  red: { icon: 'bg-red-50 text-red-600', bar: 'bg-red-500', badge: 'bg-red-50 text-red-700 border-red-100', text: 'text-red-600', soft: 'bg-red-50' },
};

const productVisuals: Array<{ Icon: LucideIcon; tone: Tone }> = [
  { Icon: Shirt, tone: 'green' },
  { Icon: Shirt, tone: 'blue' },
  { Icon: Package, tone: 'orange' },
  { Icon: Shirt, tone: 'teal' },
  { Icon: Shirt, tone: 'purple' },
  { Icon: Package, tone: 'blue' },
  { Icon: Shirt, tone: 'orange' },
  { Icon: Package, tone: 'teal' },
];

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string; days: number }> = [
  { key: '30d', label: 'May 1 – May 31, 2025', days: 30 },
  { key: '60d', label: 'Last 60 Days', days: 60 },
  { key: '90d', label: 'Last 90 Days', days: 90 },
];

const FUNNEL_FILTERS: Array<{ key: FunnelFocus; label: string; stages: string[] }> = [
  { key: 'all', label: 'All', stages: [] },
  { key: 'rfq', label: 'RFQ', stages: ['Leads Captured', 'Qualified Leads / RFQs'] },
  { key: 'quote', label: 'Quotes', stages: ['Qualified Leads / RFQs', 'Quotes Sent', 'Follow-up / Negotiation'] },
  { key: 'orders', label: 'Orders', stages: ['Quotes Sent', 'Follow-up / Negotiation', 'Orders Won'] },
];

function one(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function fmt(n: number) { return n.toLocaleString('en-US'); }
function pct(n: number) { return `${Math.round(n * 10) / 10}%`; }
function money(value: number) { if (value >= 1000000) return `$${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`; if (value >= 1000) return `$${Math.round(value / 1000)}K`; return `$${Math.round(value)}`; }
function modeLabel(mode: WorkspaceMode) { if (mode === 'buyers') return 'Workspace: Buyer Team'; if (mode === 'suppliers') return 'Workspace: Supplier Team'; return 'Workspace: Export Team'; }
function marketCode(name: string) { return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'GL'; }
function parseRange(value: string | undefined): RangeKey { return value === '60d' || value === '90d' ? value : '30d'; }
function parseFunnel(value: string | undefined): FunnelFocus { return value === 'rfq' || value === 'quote' || value === 'orders' ? value : 'all'; }
function rangeToDates(range: RangeKey) { const option = RANGE_OPTIONS.find((item) => item.key === range) ?? RANGE_OPTIONS[0]; const to = new Date(); const from = new Date(to.getTime() - option.days * 86400000); return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }; }
function href(params: Record<string, string | null | undefined>) { const query = new URLSearchParams(); for (const [key, value] of Object.entries(params)) if (value && value !== 'all') query.set(key, value); const qs = query.toString(); return qs ? `/dashboard/analytics?${qs}` : '/dashboard/analytics'; }
function csvHref(rows: Array<Record<string, string | number>>) { if (!rows.length) return '#'; const headers = Object.keys(rows[0]); const csv = [headers.join(','), ...rows.map((row) => headers.map((key) => `"${String(row[key] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n'); return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`; }

function MarketIcon({ name, code }: { name: string; code?: string }) {
  return (
    <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 text-[10px] font-black text-blue-700 shadow-sm" title={name}>
      <Globe2 className="absolute h-5 w-5 text-blue-200" />
      <span className="relative">{code ?? marketCode(name)}</span>
    </span>
  );
}

function SelectMenu({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <details className="group relative">
      <summary className="inline-flex h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50">
        <Icon className="h-4 w-4 text-slate-600" /> {label} <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 z-20 mt-2 min-w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">{children}</div>
    </details>
  );
}

function MenuLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link href={href} className={`block rounded-xl px-3 py-2 text-sm font-bold ${active ? 'bg-slate-950 text-white' : 'text-slate-700 hover:bg-slate-50'}`}>{children}</Link>;
}

function KPI({ label, value, delta, icon: Icon, tone, href }: { label: string; value: string; delta: string; icon: LucideIcon; tone: Tone; href?: string }) {
  const classes = toneClasses[tone];
  const card = <article className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,23,42,0.09)]"><div className="flex items-center gap-4"><span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full ${classes.icon}`}><Icon className="h-7 w-7" strokeWidth={2.15} /></span><div className="min-w-0"><p className="text-sm font-bold text-slate-800">{label}</p><p className="mt-1 text-3xl font-black tracking-tight text-slate-950">{value}</p><p className={`mt-1 text-xs font-bold ${classes.text}`}>↑ {delta}</p></div></div></article>;
  return href ? <Link href={href}>{card}</Link> : card;
}

function AnalyticsShellHeader({ mode, range, market, marketRows, exportRows }: { mode: WorkspaceMode; range: RangeKey; market: string; marketRows: MarketRow[]; exportRows: Array<Record<string, string | number>> }) {
  const rangeLabel = RANGE_OPTIONS.find((item) => item.key === range)?.label ?? RANGE_OPTIONS[0].label;
  return (
    <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div><h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Analytics</h1><p className="mt-1 text-sm text-slate-600">Know where your export pipeline is growing, stuck, and ready to convert.</p></div>
      <div className="flex flex-wrap items-center gap-3">
        <SelectMenu icon={CalendarDays} label={rangeLabel}>{RANGE_OPTIONS.map((item) => <MenuLink key={item.key} active={range === item.key} href={href({ range: item.key, market })}>{item.label}</MenuLink>)}</SelectMenu>
        <SelectMenu icon={Users} label={modeLabel(mode)}>{(['all', 'buyers', 'suppliers'] as const).map((item) => <MenuLink key={item} active={mode === item} href={href({ range, market, mode: item })}>{modeLabel(item)}</MenuLink>)}</SelectMenu>
        <SelectMenu icon={Globe2} label={`Market: ${market === 'all' ? 'All' : market}`}><MenuLink active={market === 'all'} href={href({ range, market: 'all', mode })}>All Markets</MenuLink>{marketRows.map((item) => <MenuLink key={item.name} active={market === item.name} href={href({ range, market: item.name, mode })}>{item.name}</MenuLink>)}</SelectMenu>
        <a href={csvHref(exportRows)} download={`setu-flow-analytics-${range}.csv`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-cyan-700 px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(15,118,110,0.28)] transition hover:from-teal-800 hover:to-cyan-800"><Download className="h-4 w-4" /> Export</a>
      </div>
    </section>
  );
}

function buildExportFunnel(data: AnalyticsData, focus: FunnelFocus) {
  const allowed = FUNNEL_FILTERS.find((item) => item.key === focus)?.stages ?? [];
  return data.funnel.map((stage, index) => ({ label: stage.label, count: stage.count, pct: index === 0 ? 100 : stage.pct, href: stage.href, tone: (['blue', 'teal', 'green', 'purple', 'orange'][index] ?? 'blue') as Tone })).filter((stage) => !allowed.length || allowed.includes(stage.label));
}

function ConversionFunnel({ data, focus, range, market, mode }: { data: AnalyticsData; focus: FunnelFocus; range: RangeKey; market: string; mode: WorkspaceMode }) {
  const stages = buildExportFunnel(data, focus); const allStages = buildExportFunnel(data, 'all'); const overall = allStages[0]?.count ? ((allStages[4]?.count ?? 0) / allStages[0].count) * 100 : 0;
  return (
    <section className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-black text-slate-900">Conversion Funnel</h2><div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">{FUNNEL_FILTERS.map((item) => <Link key={item.key} href={href({ range, market, mode, funnel: item.key })} className={`rounded-lg px-3 py-1 text-xs font-black ${focus === item.key ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{item.label}</Link>)}</div></div>
      <div className="grid gap-5 md:grid-cols-[1fr_8rem]"><div className="grid gap-4 sm:grid-cols-[10rem_1fr_5rem] sm:items-center"><div className="space-y-5">{stages.map((stage) => <Link href={stage.href} key={stage.label} className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-950"><span className={`h-2 w-2 rounded-full ${toneClasses[stage.tone].bar}`} />{stage.label}</Link>)}</div><div className="flex flex-col items-center justify-center gap-1 py-2">{stages.map((stage, index) => { const width = Math.max(34, 100 - index * 14); const color = ['bg-blue-600', 'bg-cyan-500', 'bg-emerald-400', 'bg-violet-500', 'bg-violet-700'][index] ?? 'bg-slate-300'; return <Link href={stage.href} key={stage.label} className={`${color} h-11 rounded-md shadow-sm`} style={{ width: `${width}%`, clipPath: 'polygon(8% 0, 92% 0, 82% 100%, 18% 100%)' }} aria-label={stage.label} />; })}</div><div className="space-y-3 text-right">{stages.map((stage) => <div key={stage.label}><p className="text-sm font-black text-slate-950">{fmt(stage.count)}</p><p className="text-xs font-semibold text-slate-400">{pct(stage.pct)}</p></div>)}</div></div><div className="flex flex-col justify-center rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-center"><p className="text-xs font-bold text-slate-600">Overall Conversion Rate</p><p className="mt-3 text-3xl font-black text-blue-600">{pct(overall)}</p><p className="mt-2 text-xs font-semibold text-slate-500">Lead to won order</p></div></div>
      <div className="mt-5 flex gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-slate-700"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" /><div><p>Biggest drop is from Quotes Sent to Orders Won.</p><p>Improve follow-ups to convert more export quotes.</p></div></div>
    </section>
  );
}

function PipelineMovement({ rows }: { rows: PipelineMovementRow[] }) { const max = Math.max(...rows.map((row) => row.value), 1); return <section className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-base font-black text-slate-900">Pipeline Movement</h2><Info className="h-4 w-4 text-slate-400" /></div><div className="space-y-4">{rows.map((row) => <div key={row.label}><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="font-semibold text-slate-700">{row.label}</span><span className="font-black text-slate-950">{money(row.value)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${toneClasses[row.tone].bar}`} style={{ width: `${Math.max(8, (row.value / max) * 100)}%` }} /></div></div>)}</div><p className="mt-5 text-xs font-semibold text-slate-500">Movement by business value, not raw stage count.</p></section>; }

function TopMarkets({ rows }: { rows: MarketRow[] }) { return <section className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-base font-black text-slate-900">Top Markets by Pipeline</h2><Globe2 className="h-4 w-4 text-slate-400" /></div><div className="space-y-4">{rows.length ? rows.map((row, index) => <div key={row.name} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3 text-sm"><span className="font-black text-slate-900">{index + 1}</span><span className="flex items-center gap-2 font-bold text-slate-800"><MarketIcon name={row.name} code={row.code} />{row.name}</span><span className="font-black text-slate-950">{money(row.value)}</span><span /><span className="h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-blue-600" style={{ width: `${Math.max(8, row.pct)}%` }} /></span></div>) : <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-400">No market pipeline data available yet.</p>}</div></section>; }

function ProductVisual({ row }: { row: ProductRow }) { const Icon = row.Icon; if (row.imageUrl) return <img src={row.imageUrl} alt="" className="h-11 w-11 rounded-xl object-cover ring-1 ring-slate-200" loading="lazy" referrerPolicy="no-referrer" />; return <span className={`grid h-11 w-11 place-items-center overflow-hidden rounded-xl ring-1 ring-slate-200 ${toneClasses[row.tone].icon}`}><Icon className="h-6 w-6" /></span>; }
function TopProducts({ rows }: { rows: ProductRow[] }) { return <section className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]"><h2 className="mb-4 text-base font-black text-slate-900">Top Products by Pipeline</h2><div className="overflow-x-auto"><table className="min-w-[620px] w-full divide-y divide-slate-100"><thead><tr className="text-left text-xs font-bold text-slate-500"><th className="py-2">Product</th><th className="py-2 text-right">Pipeline Value</th><th className="py-2 text-right">Quotes</th><th className="py-2 text-right">% of Total</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.length ? rows.map((row, index) => <tr key={row.name}><td className="py-3"><div className="flex items-center gap-3"><span className="w-5 text-sm font-black text-slate-950">{index + 1}</span><ProductVisual row={row} /><span className="text-sm font-bold text-slate-900">{row.name}{row.topMarket ? <span className="mt-0.5 block text-xs font-semibold text-slate-400">Top market: {row.topMarket}</span> : null}</span></div></td><td className="py-3 text-right text-sm font-black text-slate-950">{money(row.value)}</td><td className="py-3 text-right text-sm font-semibold text-slate-600">{fmt(row.quotes)}</td><td className="py-3 text-right"><div className="ml-auto grid w-36 grid-cols-[1fr_3rem] items-center gap-2"><span className="h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-blue-600" style={{ width: `${Math.max(8, row.pct)}%` }} /></span><span className="text-xs font-black text-slate-600">{pct(row.pct)}</span></div></td></tr>) : <tr><td colSpan={4} className="py-8 text-center text-sm text-slate-400">No product demand data available yet.</td></tr>}</tbody></table></div><Link href="/products" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-600">View full product performance →</Link></section>; }
function Insights({ data, stalledValue }: { data: AnalyticsData; stalledValue: number }) { const rows: Array<{ Icon: LucideIcon; title: string; body: string; tag: string; tone: Tone }> = [{ Icon: TrendingUp, title: 'Win rate improved', body: `Quote acceptance rate is ${data.quoteMetrics.winRate}% in the current scope.`, tag: 'Positive', tone: 'green' }, { Icon: Clock3, title: 'Quote aging high', body: `${fmt(data.quoteMetrics.stalled14Days)} quotes have no fresh activity in 14+ days.`, tag: data.quoteMetrics.stalled14Days ? 'Attention' : 'Clear', tone: 'orange' }, { Icon: Globe2, title: 'New market opportunity', body: `${fmt(data.marketBreakdown.length)} active markets are contributing pipeline.`, tag: 'Positive', tone: 'green' }, { Icon: AlertTriangle, title: 'Pipeline at risk', body: `${money(stalledValue)} in estimated pipeline needs fresh activity across ${fmt(data.quoteMetrics.openPending)} open quotes.`, tag: stalledValue ? 'At Risk' : 'Clear', tone: stalledValue ? 'red' : 'green' }]; return <section className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]"><h2 className="mb-4 text-base font-black text-slate-900">Insights & Anomalies</h2><div className="space-y-3">{rows.map((row) => { const classes = toneClasses[row.tone]; const Icon = row.Icon; return <article key={row.title} className="grid gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 sm:grid-cols-[auto_1fr_auto] sm:items-center"><span className={`grid h-10 w-10 place-items-center rounded-full ${classes.icon}`}><Icon className="h-5 w-5" /></span><div><p className="font-black text-slate-900">{row.title}</p><p className="text-sm text-slate-500">{row.body}</p></div><span className={`w-fit rounded-xl border px-3 py-1 text-xs font-black ${classes.badge}`}>{row.tag}</span></article>; })}</div></section>; }
function MarketStrip({ rows }: { rows: MarketRow[] }) { return <section className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-base font-black text-slate-900">Market & Region Performance</h2><Link href="/markets" className="text-sm font-bold text-blue-600">View full market report →</Link></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{rows.map((row) => <div key={row.name} className="flex items-center gap-3 border-slate-100 xl:border-r xl:last:border-r-0"><MarketIcon name={row.name} code={row.code} /><div><p className="text-sm font-black text-slate-900">{row.name}</p><p className="text-lg font-black text-slate-950">{money(row.value)} <span className={`ml-2 text-sm font-bold ${row.growth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{row.growth >= 0 ? '↑' : '↓'} {pct(Math.abs(row.growth))}</span></p></div></div>)}</div></section>; }

export default async function AnalyticsPage({ searchParams }: { searchParams?: SearchParams }) {
  if (!hasSupabaseEnv) redirect('/dashboard');
  const workspace = await getWorkspaceAccess(); if (!workspace.user || !workspace.organization) redirect('/login');
  const mode = parseWorkspaceMode(searchParams?.mode); const range = parseRange(one(searchParams?.range)); const market = one(searchParams?.market) ?? 'all'; const funnel = parseFunnel(one(searchParams?.funnel)); const dates = rangeToDates(range);
  const data = await getAnalyticsData(workspace.organization.id, mode, { ...dates, market });
  const { quoteMetrics: qm, orderMetrics: om, pipelineMovement: pm } = data;
  const conversionRate = data.funnel[0]?.count ? (om.completed / data.funnel[0].count) * 100 : 0;
  const productTotal = Math.max(data.productBreakdown.reduce((sum, row) => sum + row.pipelineValueUsd, 0), data.pipelineValueUsd, 1);
  const marketMax = Math.max(...data.marketBreakdown.map((row) => row.pipelineValueUsd || row.leadCount), 1);
  const movementRows: PipelineMovementRow[] = [{ label: 'New Pipeline Added', value: pm.newPipelineUsd, helper: 'new buyer opportunities', tone: 'blue' }, { label: 'Moved Forward', value: pm.movedForwardUsd, helper: 'stage movement and accepted quotes', tone: 'teal' }, { label: 'Stalled 14+ Days', value: pm.stalled14DaysUsd, helper: 'quotes without fresh activity', tone: 'orange' }, { label: 'Closed Won', value: pm.closedWonUsd, helper: 'orders won value', tone: 'green' }, { label: 'Closed Lost', value: pm.closedLostUsd, helper: 'rejected quote value', tone: 'red' }];
  const marketRows: MarketRow[] = data.marketBreakdown.slice(0, 5).map((row) => ({ name: row.market, value: row.pipelineValueUsd, pct: ((row.pipelineValueUsd || row.leadCount) / marketMax) * 100, growth: row.growthPct, code: marketCode(row.market) }));
  const productRows: ProductRow[] = data.productBreakdown.slice(0, 5).map((row, index) => { const visual = productVisuals[index] ?? { Icon: Package, tone: 'blue' as Tone }; return { name: row.category, value: row.pipelineValueUsd, quotes: row.activeQuotes, pct: (row.pipelineValueUsd / productTotal) * 100, Icon: visual.Icon, tone: visual.tone, imageUrl: row.imageUrl, topMarket: row.topMarket }; });
  const revenueWon = om.totalValueUsd || pm.closedWonUsd;
  const exportRows = [...data.funnel.map((row) => ({ section: 'Conversion Funnel', metric: row.label, value: row.count, percent: `${row.pct}%` })), ...movementRows.map((row) => ({ section: 'Pipeline Movement', metric: row.label, value: Math.round(row.value), percent: '' })), ...marketRows.map((row) => ({ section: 'Markets', metric: row.name, value: Math.round(row.value), percent: `${row.growth}% growth` })), ...productRows.map((row) => ({ section: 'Products', metric: row.name, value: Math.round(row.value), percent: `${Math.round(row.pct * 10) / 10}%` }))];

  return <main className="space-y-6"><AnalyticsShellHeader mode={mode} range={range} market={market} marketRows={marketRows} exportRows={exportRows} /><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"><KPI label="Pipeline Value" value={money(data.pipelineValueUsd)} delta="live scoped value" icon={TrendingUp} tone="blue" href="/pipeline" /><KPI label="Quotes Sent" value={fmt(qm.totalSent)} delta={`${fmt(qm.openPending)} active`} icon={Mail} tone="green" href="/quotes" /><KPI label="Conversion Rate" value={pct(conversionRate)} delta="lead to won order" icon={Target} tone="purple" href="/reports" /><KPI label="Orders Won" value={fmt(om.completed)} delta="won export orders" icon={Trophy} tone="orange" href="/orders" /><KPI label="Revenue Won" value={money(revenueWon)} delta="closed order value" icon={CircleDollarSign} tone="teal" href="/orders" /></section><section className="grid gap-4 xl:grid-cols-[1.25fr_0.85fr_1.05fr]"><ConversionFunnel data={data} focus={funnel} range={range} market={market} mode={mode} /><PipelineMovement rows={movementRows} /><TopMarkets rows={marketRows} /></section><section className="grid gap-4 xl:grid-cols-[1fr_1.2fr]"><TopProducts rows={productRows} /><Insights data={data} stalledValue={pm.stalled14DaysUsd} /></section><MarketStrip rows={marketRows} /></main>;
}
