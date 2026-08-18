import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Clock3,
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
import { DashboardExportModal } from '@/components/dashboard/dashboard-export-modal';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getAnalyticsData } from '@/lib/queries/analytics';
import type { AnalyticsData } from '@/lib/queries/analytics';
import { hasSupabaseEnv } from '@/lib/env';
import { parseWorkspaceMode } from '@/features/workspace/mode';
import type { WorkspaceMode } from '@/features/workspace/types';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationVerticals } from '@/lib/verticals/capability';
import { getPackagingProductionAnalytics } from '@/lib/packaging/queries';
import PackagingAnalyticsDashboard from '@/features/packaging/components/packaging-analytics-dashboard';

type Tone = 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'red';
type RangeKey = '30d' | '60d' | '90d';
type FunnelFocus = 'all' | 'rfq' | 'quote' | 'orders';
type SearchParams = { mode?: string | string[]; range?: string | string[]; market?: string | string[]; funnel?: string | string[] };
type MovementRow = { label: string; value: number; tone: Tone };
type MarketRow = { name: string; value: number; pct: number; growth: number; code: string };
type ProductRow = { name: string; value: number; pct: number; quotes: number; Icon: LucideIcon; tone: Tone; imageUrl: string | null; topMarket: string | null };

const tone: Record<Tone, { icon: string; bar: string; badge: string; text: string }> = {
  blue: { icon: 'bg-blue-50 text-blue-600', bar: 'bg-blue-600', badge: 'bg-blue-50 text-blue-700 border-blue-100', text: 'text-blue-600' },
  green: { icon: 'bg-emerald-50 text-emerald-600', bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100', text: 'text-emerald-600' },
  orange: { icon: 'bg-orange-50 text-orange-600', bar: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-100', text: 'text-orange-600' },
  purple: { icon: 'bg-violet-50 text-violet-600', bar: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 border-violet-100', text: 'text-violet-600' },
  teal: { icon: 'bg-teal-50 text-teal-600', bar: 'bg-teal-500', badge: 'bg-teal-50 text-teal-700 border-teal-100', text: 'text-teal-600' },
  red: { icon: 'bg-red-50 text-red-600', bar: 'bg-red-500', badge: 'bg-red-50 text-red-700 border-red-100', text: 'text-red-600' },
};

const rangeOptions: Array<{ key: RangeKey; label: string; days: number }> = [
  { key: '30d', label: 'May 1 - May 31, 2025', days: 30 },
  { key: '60d', label: 'Last 60 Days', days: 60 },
  { key: '90d', label: 'Last 90 Days', days: 90 },
];

function funnelFilterOptions(mode: WorkspaceMode): Array<{ key: FunnelFocus; label: string; stages: string[] }> {
  if (mode === 'suppliers') {
    return [
      { key: 'all', label: 'All', stages: [] },
      { key: 'rfq', label: 'Cost Requests', stages: ['Suppliers Captured', 'Profile Review / Verification', 'Cost Requests Sent'] },
      { key: 'quote', label: 'Responses', stages: ['Cost Requests Sent', 'Responses Received'] },
      { key: 'orders', label: 'Approved', stages: ['Responses Received', 'Approved Suppliers'] },
    ];
  }
  return [
    { key: 'all', label: 'All', stages: [] },
    { key: 'rfq', label: 'RFQ', stages: ['Leads Captured', 'Qualified Leads / RFQs'] },
    { key: 'quote', label: 'Quotes', stages: ['Qualified Leads / RFQs', 'Quotes Sent', 'Follow-up / Negotiation'] },
    { key: 'orders', label: 'Orders', stages: ['Quotes Sent', 'Follow-up / Negotiation', 'Orders Won'] },
  ];
}

const productVisuals: Array<{ Icon: LucideIcon; tone: Tone }> = [
  { Icon: Shirt, tone: 'green' },
  { Icon: Shirt, tone: 'blue' },
  { Icon: Package, tone: 'orange' },
  { Icon: Shirt, tone: 'teal' },
  { Icon: Shirt, tone: 'purple' },
];

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function fmt(value: number) { return value.toLocaleString('en-US'); }
function pct(value: number) { return `${Math.round(value * 10) / 10}%`; }
function money(value: number) { if (value >= 1000000) return `$${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`; if (value >= 1000) return `$${Math.round(value / 1000)}K`; return `$${Math.round(value)}`; }
function modeLabel(mode: WorkspaceMode) { if (mode === 'buyers') return 'Workspace: Buyer Team'; if (mode === 'suppliers') return 'Workspace: Supplier Team'; return 'Workspace: Export Team'; }
function parseRange(value: string | undefined): RangeKey { return value === '60d' || value === '90d' ? value : '30d'; }
function parseFunnel(value: string | undefined): FunnelFocus { return value === 'rfq' || value === 'quote' || value === 'orders' ? value : 'all'; }
function marketCode(name: string) { return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'GL'; }
function datesFor(range: RangeKey) { const config = rangeOptions.find((item) => item.key === range) ?? rangeOptions[0]; const to = new Date(); const from = new Date(to.getTime() - config.days * 86400000); return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }; }
function route(params: Record<string, string | null | undefined>) { const query = new URLSearchParams(); for (const [key, value] of Object.entries(params)) if (value && value !== 'all') query.set(key, value); const text = query.toString(); return text ? `/dashboard/analytics?${text}` : '/dashboard/analytics'; }

function MarketIcon({ name, code }: { name: string; code?: string }) {
  return <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 text-[10px] font-semibold text-blue-700 shadow-sm" title={name}><Globe2 className="absolute h-5 w-5 text-blue-200" /><span className="relative">{code ?? marketCode(name)}</span></span>;
}

function SelectMenu({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return <details className="group relative"><summary className="inline-flex h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"><Icon className="h-4 w-4 text-slate-600" />{label}<ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" /></summary><div className="absolute right-0 z-20 mt-2 min-w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">{children}</div></details>;
}

function MenuLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link href={href} className={`block rounded-xl px-3 py-2 text-sm font-medium ${active ? 'bg-slate-950 text-white' : 'text-slate-700 hover:bg-slate-50'}`}>{children}</Link>;
}

function KpiCard({ label, value, helper, Icon, variant, href }: { label: string; value: string; helper: string; Icon: LucideIcon; variant: Tone; href?: string }) {
  const card = <article className="rounded-panel border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.045)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(15,23,42,0.07)]"><div className="flex items-center gap-4"><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${tone[variant].icon}`}><Icon className="h-6 w-6" strokeWidth={2} /></span><div><p className="text-sm font-medium text-slate-700">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{value}</p><p className={`mt-1 text-xs font-medium ${tone[variant].text}`}>{helper}</p></div></div></article>;
  return href ? <Link href={href}>{card}</Link> : card;
}

function AnalyticsHeader({ mode, range, market, markets }: { mode: WorkspaceMode; range: RangeKey; market: string; markets: MarketRow[] }) {
  const rangeLabel = rangeOptions.find((item) => item.key === range)?.label ?? rangeOptions[0].label;
  return <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">Analytics</h1><p className="mt-1 text-sm text-slate-600">Know where your export pipeline is growing, stuck, and ready to convert.</p></div><div className="flex flex-wrap items-center gap-3"><SelectMenu icon={CalendarDays} label={rangeLabel}>{rangeOptions.map((item) => <MenuLink key={item.key} active={range === item.key} href={route({ range: item.key, market, mode })}>{item.label}</MenuLink>)}</SelectMenu><SelectMenu icon={Users} label={modeLabel(mode)}>{(['all', 'buyers', 'suppliers'] as const).map((item) => <MenuLink key={item} active={mode === item} href={route({ range, market, mode: item })}>{modeLabel(item)}</MenuLink>)}</SelectMenu><SelectMenu icon={Globe2} label={`Market: ${market === 'all' ? 'All' : market}`}><MenuLink active={market === 'all'} href={route({ range, market: 'all', mode })}>All Markets</MenuLink>{markets.map((item) => <MenuLink key={item.name} active={market === item.name} href={route({ range, market: item.name, mode })}>{item.name}</MenuLink>)}</SelectMenu><DashboardExportModal active="analytics" tone="teal" label="Export" /></div></section>;
}

function filteredFunnel(data: AnalyticsData, focus: FunnelFocus, mode: WorkspaceMode) {
  const allowed = funnelFilterOptions(mode).find((item) => item.key === focus)?.stages ?? [];
  return data.funnel.map((stage, index) => ({ label: stage.label, count: stage.count, pct: index === 0 ? 100 : stage.pct, href: stage.href, tone: (['blue', 'teal', 'green', 'purple', 'orange'][index] ?? 'blue') as Tone })).filter((stage) => !allowed.length || allowed.includes(stage.label));
}

function ConversionFunnel({ data, focus, range, market, mode }: { data: AnalyticsData; focus: FunnelFocus; range: RangeKey; market: string; mode: WorkspaceMode }) {
  const stages = filteredFunnel(data, focus, mode);
  const allStages = filteredFunnel(data, 'all', mode);
  const overall = allStages[0]?.count ? ((allStages[4]?.count ?? 0) / allStages[0].count) * 100 : 0;
  return <section className="rounded-panel border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.045)]"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-semibold text-slate-900">Conversion Funnel</h2><div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">{funnelFilterOptions(mode).map((item) => <Link key={item.key} href={route({ range, market, mode, funnel: item.key })} className={`rounded-lg px-3 py-1 text-xs font-semibold ${focus === item.key ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{item.label}</Link>)}</div></div><div className="grid gap-5 md:grid-cols-[1fr_8rem]"><div className="grid gap-4 sm:grid-cols-[10rem_1fr_5rem] sm:items-center"><div className="space-y-5">{stages.map((stage) => <Link href={stage.href} key={stage.label} className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-950"><span className={`h-2 w-2 rounded-full ${tone[stage.tone].bar}`} />{stage.label}</Link>)}</div><div className="flex flex-col items-center justify-center gap-1 py-2">{stages.map((stage, index) => { const width = Math.max(34, 100 - index * 14); const color = ['bg-blue-600', 'bg-cyan-500', 'bg-emerald-400', 'bg-violet-500', 'bg-violet-700'][index] ?? 'bg-slate-300'; return <Link href={stage.href} key={stage.label} className={`${color} h-11 rounded-md shadow-sm`} style={{ width: `${width}%`, clipPath: 'polygon(8% 0, 92% 0, 82% 100%, 18% 100%)' }} aria-label={stage.label} />; })}</div><div className="space-y-3 text-right">{stages.map((stage) => <div key={stage.label}><p className="text-sm font-semibold text-slate-950">{fmt(stage.count)}</p><p className="text-xs font-medium text-slate-400">{pct(stage.pct)}</p></div>)}</div></div><div className="flex flex-col justify-center rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-center"><p className="text-xs font-medium text-slate-600">Overall Conversion Rate</p><p className="mt-3 text-3xl font-semibold text-blue-600">{pct(overall)}</p><p className="mt-2 text-xs font-medium text-slate-500">{mode === 'suppliers' ? 'Supplier to approved' : 'Lead to won order'}</p></div></div><div className="mt-5 flex gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-slate-700"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" /><div><p>{mode === 'suppliers' ? 'Biggest drop is from Cost Requests Sent to Approved Suppliers.' : 'Biggest drop is from Quotes Sent to Orders Won.'}</p><p>{mode === 'suppliers' ? 'Improve supplier response review, document readiness, and approval follow-up.' : 'Improve follow-ups to convert more export quotes.'}</p></div></div></section>;
}

function Movement({ rows }: { rows: MovementRow[] }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return <section className="rounded-panel border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.045)]"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-base font-semibold text-slate-900">Pipeline Movement</h2><Info className="h-4 w-4 text-slate-400" /></div><div className="space-y-4">{rows.map((row) => <div key={row.label}><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="font-medium text-slate-700">{row.label}</span><span className="font-semibold text-slate-950">{money(row.value)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${tone[row.tone].bar}`} style={{ width: `${Math.max(8, (row.value / max) * 100)}%` }} /></div></div>)}</div><p className="mt-5 text-xs font-medium text-slate-500">Movement by business value, not raw stage count.</p></section>;
}

function TopMarkets({ rows }: { rows: MarketRow[] }) {
  return <section className="rounded-panel border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.045)]"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-base font-semibold text-slate-900">Top Markets by Pipeline</h2><Globe2 className="h-4 w-4 text-slate-400" /></div><div className="space-y-4">{rows.length ? rows.map((row, index) => <div key={row.name} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3 text-sm"><span className="font-semibold text-slate-900">{index + 1}</span><span className="flex items-center gap-2 font-medium text-slate-800"><MarketIcon name={row.name} code={row.code} />{row.name}</span><span className="font-semibold text-slate-950">{money(row.value)}</span><span /><span className="h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-blue-600" style={{ width: `${Math.max(8, row.pct)}%` }} /></span></div>) : <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-400">No market pipeline data available yet.</p>}</div></section>;
}

function ProductVisual({ item }: { item: ProductRow }) {
  const Icon = item.Icon;
  if (item.imageUrl) return <img src={item.imageUrl} alt="" className="h-11 w-11 rounded-xl object-cover ring-1 ring-slate-200" loading="lazy" referrerPolicy="no-referrer" />;
  return <span className={`grid h-11 w-11 place-items-center overflow-hidden rounded-xl ring-1 ring-slate-200 ${tone[item.tone].icon}`}><Icon className="h-6 w-6" /></span>;
}

function TopProducts({ rows }: { rows: ProductRow[] }) {
  return <section className="rounded-panel border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.045)]"><h2 className="mb-4 text-base font-semibold text-slate-900">Top Products by Pipeline</h2><div className="overflow-x-auto"><table className="min-w-[620px] w-full divide-y divide-slate-100"><thead><tr className="text-left text-xs font-medium text-slate-500"><th className="py-2">Product</th><th className="py-2 text-right">Pipeline Value</th><th className="py-2 text-right">Quotes</th><th className="py-2 text-right">% of Total</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.length ? rows.map((row, index) => <tr key={row.name}><td className="py-3"><div className="flex items-center gap-3"><span className="w-5 text-sm font-semibold text-slate-950">{index + 1}</span><ProductVisual item={row} /><span className="text-sm font-medium text-slate-900">{row.name}{row.topMarket ? <span className="mt-0.5 block text-xs font-medium text-slate-400">Top market: {row.topMarket}</span> : null}</span></div></td><td className="py-3 text-right text-sm font-semibold text-slate-950">{money(row.value)}</td><td className="py-3 text-right text-sm font-medium text-slate-600">{fmt(row.quotes)}</td><td className="py-3 text-right"><div className="ml-auto grid w-36 grid-cols-[1fr_3rem] items-center gap-2"><span className="h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-blue-600" style={{ width: `${Math.max(8, row.pct)}%` }} /></span><span className="text-xs font-semibold text-slate-600">{pct(row.pct)}</span></div></td></tr>) : <tr><td colSpan={4} className="py-8 text-center text-sm text-slate-400">No product demand data available yet.</td></tr>}</tbody></table></div><Link href="/products" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600">View full product performance</Link></section>;
}

function Insights({ data, stalledValue, mode }: { data: AnalyticsData; stalledValue: number; mode: WorkspaceMode }) {
  const isSupplierMode = mode === 'suppliers';
  const rows: Array<{ Icon: LucideIcon; title: string; body: string; tag: string; variant: Tone }> = [
    { Icon: TrendingUp, title: isSupplierMode ? 'Approval movement visible' : 'Win rate improved', body: isSupplierMode ? `${fmt(data.funnel[4]?.count ?? 0)} suppliers are at approved/linked stage in this scope.` : `Quote acceptance rate is ${data.quoteMetrics.winRate}% in the current scope.`, tag: 'Positive', variant: 'green' },
    { Icon: Clock3, title: isSupplierMode ? 'Supplier follow-up aging' : 'Quote aging high', body: isSupplierMode ? `${fmt(data.rfqMetrics.open)} supplier cost requests are still open.` : `${fmt(data.quoteMetrics.stalled14Days)} quotes have no fresh activity in 14+ days.`, tag: isSupplierMode ? (data.rfqMetrics.open ? 'Attention' : 'Clear') : (data.quoteMetrics.stalled14Days ? 'Attention' : 'Clear'), variant: 'orange' },
    { Icon: Globe2, title: 'New market opportunity', body: `${fmt(data.marketBreakdown.length)} active markets are contributing pipeline.`, tag: 'Positive', variant: 'green' },
    { Icon: AlertTriangle, title: isSupplierMode ? 'Sourcing value at risk' : 'Pipeline at risk', body: isSupplierMode ? `${money(stalledValue)} in sourcing value needs document, response, or approval movement.` : `${money(stalledValue)} in estimated pipeline needs fresh activity across ${fmt(data.quoteMetrics.openPending)} open quotes.`, tag: stalledValue ? 'At Risk' : 'Clear', variant: stalledValue ? 'red' : 'green' },
  ];
  return <section className="rounded-panel border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.045)]"><h2 className="mb-4 text-base font-semibold text-slate-900">Insights & Anomalies</h2><div className="space-y-3">{rows.map((row) => { const Icon = row.Icon; return <article key={row.title} className="grid gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 sm:grid-cols-[auto_1fr_auto] sm:items-center"><span className={`grid h-10 w-10 place-items-center rounded-full ${tone[row.variant].icon}`}><Icon className="h-5 w-5" /></span><div><p className="font-semibold text-slate-900">{row.title}</p><p className="text-sm text-slate-500">{row.body}</p></div><span className={`w-fit rounded-xl border px-3 py-1 text-xs font-semibold ${tone[row.variant].badge}`}>{row.tag}</span></article>; })}</div></section>;
}

function MarketStrip({ rows }: { rows: MarketRow[] }) {
  return <section className="rounded-panel border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.045)]"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-base font-semibold text-slate-900">Market & Region Performance</h2><Link href="/markets" className="text-sm font-medium text-blue-600">View full market report</Link></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{rows.map((row) => <div key={row.name} className="flex items-center gap-3 border-slate-100 xl:border-r xl:last:border-r-0"><MarketIcon name={row.name} code={row.code} /><div><p className="text-sm font-semibold text-slate-900">{row.name}</p><p className="text-lg font-semibold text-slate-950">{money(row.value)} <span className={`ml-2 text-sm font-medium ${row.growth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{row.growth >= 0 ? '↑' : '↓'} {pct(Math.abs(row.growth))}</span></p></div></div>)}</div></section>;
}

export default async function AnalyticsPage({ searchParams }: { searchParams?: SearchParams }) {
  if (!hasSupabaseEnv) redirect('/dashboard');
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) redirect('/login');

  const mode = parseWorkspaceMode(searchParams?.mode);
  const range = parseRange(first(searchParams?.range));
  const market = first(searchParams?.market) ?? 'all';
  const funnel = parseFunnel(first(searchParams?.funnel));
  const data = await getAnalyticsData(workspace.organization.id, mode, { ...datesFor(range), market });
  const supabase = await createClient();
  const verticals = await getOrganizationVerticals(workspace.organization.id, supabase);
  const packagingAnalytics = verticals.packagingEnabled
    ? await getPackagingProductionAnalytics(workspace.organization.id, supabase)
    : null;
  const movement = data.pipelineMovement;
  const isSupplierMode = mode === 'suppliers';
  const ordersWon = isSupplierMode ? (data.funnel[4]?.count ?? 0) : data.orderMetrics.completed;
  const conversionRate = data.funnel[0]?.count ? (ordersWon / data.funnel[0].count) * 100 : 0;
  const productTotal = Math.max(data.productBreakdown.reduce((sum, row) => sum + row.pipelineValueUsd, 0), data.pipelineValueUsd, 1);
  const marketMax = Math.max(...data.marketBreakdown.map((row) => row.pipelineValueUsd || row.leadCount), 1);

  const movements: MovementRow[] = [
    { label: 'New Pipeline Added', value: movement.newPipelineUsd, tone: 'blue' },
    { label: 'Moved Forward', value: movement.movedForwardUsd, tone: 'teal' },
    { label: 'Stalled 14+ Days', value: movement.stalled14DaysUsd, tone: 'orange' },
    { label: 'Closed Won', value: movement.closedWonUsd, tone: 'green' },
    { label: 'Closed Lost', value: movement.closedLostUsd, tone: 'red' },
  ];
  const markets: MarketRow[] = data.marketBreakdown.slice(0, 5).map((row) => ({ name: row.market, value: row.pipelineValueUsd, pct: ((row.pipelineValueUsd || row.leadCount) / marketMax) * 100, growth: row.growthPct, code: marketCode(row.market) }));
  const products: ProductRow[] = data.productBreakdown.slice(0, 5).map((row, index) => { const visual = productVisuals[index] ?? { Icon: Package, tone: 'blue' as Tone }; return { name: row.category, value: row.pipelineValueUsd, pct: (row.pipelineValueUsd / productTotal) * 100, quotes: row.activeQuotes, Icon: visual.Icon, tone: visual.tone, imageUrl: row.imageUrl, topMarket: row.topMarket }; });
  const revenueWon = data.orderMetrics.totalValueUsd || movement.closedWonUsd;


  return <main className="space-y-6 text-slate-900"><AnalyticsHeader mode={mode} range={range} market={market} markets={markets} /><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"><KpiCard label={isSupplierMode ? 'Sourcing Value' : 'Pipeline Value'} value={money(data.pipelineValueUsd)} helper="live scoped value" Icon={TrendingUp} variant="blue" href={isSupplierMode ? '/pipeline?mode=suppliers' : '/pipeline'} /><KpiCard label={isSupplierMode ? 'Cost Requests' : 'Quotes Sent'} value={fmt(isSupplierMode ? data.rfqMetrics.total : data.quoteMetrics.totalSent)} helper={isSupplierMode ? `${fmt(data.rfqMetrics.open)} open` : `${fmt(data.quoteMetrics.openPending)} active`} Icon={Mail} variant="green" href={isSupplierMode ? '/rfqs?mode=suppliers' : '/quotes'} /><KpiCard label={isSupplierMode ? 'Approval Rate' : 'Conversion Rate'} value={pct(conversionRate)} helper={isSupplierMode ? 'supplier to approved' : 'lead to won order'} Icon={Target} variant="purple" href={isSupplierMode ? '/reports/suppliers' : '/reports'} /><KpiCard label={isSupplierMode ? 'Approved Suppliers' : 'Orders Won'} value={fmt(ordersWon)} helper={isSupplierMode ? 'approved sourcing partners' : 'won export orders'} Icon={Trophy} variant="orange" href={isSupplierMode ? '/pipeline?mode=suppliers' : '/orders'} /><KpiCard label={isSupplierMode ? 'Linked Demand Value' : 'Revenue Won'} value={money(revenueWon)} helper={isSupplierMode ? 'buyer demand coverage' : 'closed order value'} Icon={CircleDollarSign} variant="teal" href={isSupplierMode ? '/reports/suppliers' : '/orders'} /></section><section className="grid gap-4 xl:grid-cols-[1.25fr_0.85fr_1.05fr]"><ConversionFunnel data={data} focus={funnel} range={range} market={market} mode={mode} /><Movement rows={movements} /><TopMarkets rows={markets} /></section><section className="grid gap-4 xl:grid-cols-[1fr_1.2fr]"><TopProducts rows={products} /><Insights data={data} stalledValue={movement.stalled14DaysUsd} mode={mode} /></section><MarketStrip rows={markets} />{packagingAnalytics ? <section className="rounded-panel border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.045)]"><PackagingAnalyticsDashboard data={packagingAnalytics} compact /></section> : null}<span className="sr-only">Download export opens the shared business export panel.</span></main>;
}
