import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Download,
  FileText,
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

type PipelineMovementRow = {
  label: string;
  value: number;
  helper: string;
  tone: Tone;
};

type MarketRow = { name: string; value: number; pct: number; flag: string; growth: number };
type ProductRow = { name: string; value: number; pct: number; quotes: number; Icon: LucideIcon; tone: Tone };

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

const marketFlags = ['🇮🇳', '🇦🇪', '🇺🇸', '🇬🇧', '🇪🇸', '🇫🇷', '🇩🇪', '🌍'];

function fmt(n: number) {
  return n.toLocaleString('en-US');
}

function pct(n: number) {
  return `${Math.round(n * 10) / 10}%`;
}

function money(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${Math.round(value)}`;
}

function modeLabel(mode: WorkspaceMode) {
  if (mode === 'buyers') return 'Workspace: Buyer Team';
  if (mode === 'suppliers') return 'Workspace: Supplier Team';
  return 'Workspace: Export Team';
}

function FilterButton({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <button type="button" className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50">
      <Icon className="h-4 w-4 text-slate-600" />
      {children}
      <ChevronDown className="h-4 w-4 text-slate-400" />
    </button>
  );
}

function KPI({ label, value, delta, icon: Icon, tone, href }: { label: string; value: string; delta: string; icon: LucideIcon; tone: Tone; href?: string }) {
  const classes = toneClasses[tone];
  const card = (
    <article className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,23,42,0.09)]">
      <div className="flex items-center gap-4">
        <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full ${classes.icon}`}><Icon className="h-7 w-7" strokeWidth={2.15} /></span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800">{label}</p>
          <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">{value}</p>
          <p className={`mt-1 text-xs font-bold ${classes.text}`}>↑ {delta}</p>
        </div>
      </div>
    </article>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

function AnalyticsShellHeader({ mode }: { mode: WorkspaceMode }) {
  return (
    <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Analytics</h1>
        <p className="mt-1 text-sm text-slate-600">Know where your export pipeline is growing, stuck, and ready to convert.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <FilterButton icon={CalendarDays}>May 1 – May 31, 2025</FilterButton>
        <FilterButton icon={Users}>{modeLabel(mode)}</FilterButton>
        <FilterButton icon={Globe2}>Market: All</FilterButton>
        <Link href="/reports" className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-cyan-700 px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(15,118,110,0.28)] transition hover:from-teal-800 hover:to-cyan-800">
          <Download className="h-4 w-4" /> Export
        </Link>
      </div>
    </section>
  );
}

function buildExportFunnel(data: AnalyticsData) {
  const leads = data.funnel[0]?.count ?? 0;
  const quotesSent = data.quoteMetrics.totalSent;
  const ordersWon = data.orderMetrics.completed;
  const negotiation = Math.max(0, data.quoteMetrics.totalSent - data.quoteMetrics.totalAccepted - data.quoteMetrics.totalRejected);
  const qualified = Math.max(quotesSent + negotiation + ordersWon, data.funnel[1]?.count ?? 0);
  const base = Math.max(leads, 1);
  return [
    { label: 'Leads Captured', count: leads, pct: 100, href: '/leads', tone: 'blue' as Tone },
    { label: 'Qualified Leads / RFQs', count: qualified, pct: (qualified / base) * 100, href: '/leads', tone: 'teal' as Tone },
    { label: 'Quotes Sent', count: quotesSent, pct: (quotesSent / base) * 100, href: '/quotes', tone: 'green' as Tone },
    { label: 'Follow-up / Negotiation', count: negotiation, pct: (negotiation / base) * 100, href: '/activities', tone: 'purple' as Tone },
    { label: 'Orders Won', count: ordersWon, pct: (ordersWon / base) * 100, href: '/orders', tone: 'orange' as Tone },
  ];
}

function ConversionFunnel({ data }: { data: AnalyticsData }) {
  const stages = buildExportFunnel(data);
  const overall = stages[0]?.count ? ((stages[4]?.count ?? 0) / stages[0].count) * 100 : 0;
  return (
    <section className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-slate-900">Conversion Funnel</h2>
        <Info className="h-4 w-4 text-slate-400" />
      </div>
      <div className="grid gap-5 md:grid-cols-[1fr_8rem]">
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr_5rem] sm:items-center">
          <div className="space-y-5">
            {stages.map((stage) => (
              <Link href={stage.href} key={stage.label} className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-950">
                <span className={`h-2 w-2 rounded-full ${toneClasses[stage.tone].bar}`} />{stage.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col items-center justify-center gap-1 py-2">
            {stages.map((stage, index) => {
              const width = Math.max(34, 100 - index * 14);
              const color = ['bg-blue-600', 'bg-cyan-500', 'bg-emerald-400', 'bg-violet-500', 'bg-violet-700'][index] ?? 'bg-slate-300';
              return <Link href={stage.href} key={stage.label} className={`${color} h-11 rounded-md shadow-sm`} style={{ width: `${width}%`, clipPath: 'polygon(8% 0, 92% 0, 82% 100%, 18% 100%)' }} aria-label={stage.label} />;
            })}
          </div>
          <div className="space-y-3 text-right">
            {stages.map((stage, index) => (
              <div key={stage.label}>
                <p className="text-sm font-black text-slate-950">{fmt(stage.count)}</p>
                <p className="text-xs font-semibold text-slate-400">{index === 0 ? '100%' : pct(stage.pct)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-center rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-center">
          <p className="text-xs font-bold text-slate-600">Overall Conversion Rate</p>
          <p className="mt-3 text-3xl font-black text-blue-600">{pct(overall)}</p>
          <p className="mt-2 text-xs font-semibold text-slate-500">Lead to won order</p>
        </div>
      </div>
      <div className="mt-5 flex gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-slate-700">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <div>
          <p>Biggest drop is from Quotes Sent to Orders Won.</p>
          <p>Improve follow-ups to convert more export quotes.</p>
        </div>
      </div>
    </section>
  );
}

function PipelineMovement({ rows }: { rows: PipelineMovementRow[] }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <section className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-slate-900">Pipeline Movement</h2>
        <Info className="h-4 w-4 text-slate-400" />
      </div>
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-slate-700">{row.label}</span>
              <span className="font-black text-slate-950">{money(row.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${toneClasses[row.tone].bar}`} style={{ width: `${Math.max(8, (row.value / max) * 100)}%` }} /></div>
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs font-semibold text-slate-500">Movement by business value, not raw stage count.</p>
    </section>
  );
}

function TopMarkets({ rows }: { rows: MarketRow[] }) {
  return (
    <section className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-slate-900">Top Markets by Pipeline</h2>
        <Globe2 className="h-4 w-4 text-slate-400" />
      </div>
      <div className="space-y-4">
        {rows.length ? rows.map((row, index) => (
          <div key={row.name} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3 text-sm">
            <span className="font-black text-slate-900">{index + 1}</span>
            <span className="font-bold text-slate-800"><span className="mr-2 text-xl">{row.flag}</span>{row.name}</span>
            <span className="font-black text-slate-950">{money(row.value)}</span>
            <span />
            <span className="h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-blue-600" style={{ width: `${Math.max(8, row.pct)}%` }} /></span>
          </div>
        )) : <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-400">No market pipeline data available yet.</p>}
      </div>
    </section>
  );
}

function TopProducts({ rows }: { rows: ProductRow[] }) {
  return (
    <section className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <h2 className="mb-4 text-base font-black text-slate-900">Top Products by Pipeline</h2>
      <div className="overflow-x-auto">
        <table className="min-w-[620px] w-full divide-y divide-slate-100">
          <thead>
            <tr className="text-left text-xs font-bold text-slate-500">
              <th className="py-2">Product</th>
              <th className="py-2 text-right">Pipeline Value</th>
              <th className="py-2 text-right">Quotes</th>
              <th className="py-2 text-right">% of Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length ? rows.map((row, index) => {
              const Icon = row.Icon;
              return (
                <tr key={row.name}>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-sm font-black text-slate-950">{index + 1}</span>
                      <span className={`grid h-11 w-11 place-items-center overflow-hidden rounded-xl ring-1 ring-slate-200 ${toneClasses[row.tone].icon}`}><Icon className="h-6 w-6" /></span>
                      <span className="text-sm font-bold text-slate-900">{row.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-right text-sm font-black text-slate-950">{money(row.value)}</td>
                  <td className="py-3 text-right text-sm font-semibold text-slate-600">{fmt(row.quotes)}</td>
                  <td className="py-3 text-right">
                    <div className="ml-auto grid w-36 grid-cols-[1fr_3rem] items-center gap-2">
                      <span className="h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-blue-600" style={{ width: `${Math.max(8, row.pct)}%` }} /></span>
                      <span className="text-xs font-black text-slate-600">{pct(row.pct)}</span>
                    </div>
                  </td>
                </tr>
              );
            }) : <tr><td colSpan={4} className="py-8 text-center text-sm text-slate-400">No product demand data available yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <Link href="/products" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-600">View full product performance →</Link>
    </section>
  );
}

function Insights({ data, stalledValue }: { data: AnalyticsData; stalledValue: number }) {
  const winRate = data.quoteMetrics.winRate;
  const pendingQuotes = Math.max(0, data.quoteMetrics.totalSent - data.quoteMetrics.totalAccepted - data.quoteMetrics.totalRejected);
  const rows: Array<{ Icon: LucideIcon; title: string; body: string; tag: string; tone: Tone }> = [
    { Icon: TrendingUp, title: 'Win rate improved', body: `Quote acceptance rate is ${winRate}% in the current scope.`, tag: 'Positive', tone: 'green' },
    { Icon: Clock3, title: 'Quote aging high', body: `${fmt(pendingQuotes)} quotes are still pending follow-up.`, tag: pendingQuotes ? 'Attention' : 'Clear', tone: 'orange' },
    { Icon: Globe2, title: 'New market opportunity', body: `${fmt(data.marketBreakdown.length)} active markets are contributing pipeline.`, tag: 'Positive', tone: 'green' },
    { Icon: AlertTriangle, title: 'Pipeline at risk', body: `${money(stalledValue)} in estimated pipeline needs fresh activity.`, tag: stalledValue ? 'At Risk' : 'Clear', tone: stalledValue ? 'red' : 'green' },
  ];
  return (
    <section className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <h2 className="mb-4 text-base font-black text-slate-900">Insights & Anomalies</h2>
      <div className="space-y-3">
        {rows.map((row) => {
          const classes = toneClasses[row.tone];
          const Icon = row.Icon;
          return (
            <article key={row.title} className="grid gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
              <span className={`grid h-10 w-10 place-items-center rounded-full ${classes.icon}`}><Icon className="h-5 w-5" /></span>
              <div><p className="font-black text-slate-900">{row.title}</p><p className="text-sm text-slate-500">{row.body}</p></div>
              <span className={`w-fit rounded-xl border px-3 py-1 text-xs font-black ${classes.badge}`}>{row.tag}</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MarketStrip({ rows }: { rows: MarketRow[] }) {
  return (
    <section className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-slate-900">Market & Region Performance</h2>
        <Link href="/markets" className="text-sm font-bold text-blue-600">View full market report →</Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center gap-3 border-slate-100 xl:border-r xl:last:border-r-0">
            <span className="text-3xl">{row.flag}</span>
            <div>
              <p className="text-sm font-black text-slate-900">{row.name}</p>
              <p className="text-lg font-black text-slate-950">{money(row.value)} <span className="ml-2 text-sm font-bold text-emerald-600">↑ {pct(row.growth)}</span></p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function AnalyticsPage({ searchParams }: { searchParams?: { mode?: string | string[] } }) {
  if (!hasSupabaseEnv) redirect('/dashboard');
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) redirect('/login');
  const mode = parseWorkspaceMode(searchParams?.mode);
  const data = await getAnalyticsData(workspace.organization.id, mode);
  const { quoteMetrics: qm, orderMetrics: om } = data;
  const conversionRate = data.funnel[0]?.count ? (om.completed / data.funnel[0].count) * 100 : 0;
  const productTotal = Math.max(data.productBreakdown.reduce((sum, row) => sum + row.pipelineValueUsd, 0), data.pipelineValueUsd, 1);
  const marketMax = Math.max(...data.marketBreakdown.map((row) => row.leadCount), 1);
  const avgLeadValue = data.funnel[0]?.count ? data.pipelineValueUsd / Math.max(data.funnel[0].count, 1) : 0;
  const wonValue = om.totalValueUsd || om.completed * avgLeadValue;
  const lostValue = qm.totalRejected * avgLeadValue;
  const stalledValue = Math.max(0, (qm.totalSent - qm.totalAccepted - qm.totalRejected) * avgLeadValue);
  const movementRows: PipelineMovementRow[] = [
    { label: 'New Pipeline Added', value: data.pipelineValueUsd, helper: 'new buyer opportunities', tone: 'blue' },
    { label: 'Moved Forward', value: Math.max(wonValue, qm.totalAccepted * avgLeadValue), helper: 'accepted quotes and won movement', tone: 'teal' },
    { label: 'Stalled 14+ Days', value: stalledValue, helper: 'quotes waiting for action', tone: 'orange' },
    { label: 'Closed Won', value: wonValue, helper: 'orders won value', tone: 'green' },
    { label: 'Closed Lost', value: lostValue, helper: 'rejected quote value', tone: 'red' },
  ];
  const marketRows: MarketRow[] = data.marketBreakdown.slice(0, 5).map((row, index) => ({
    name: row.market,
    value: Math.max(row.leadCount * avgLeadValue, row.orderCount ? row.orderCount * avgLeadValue : 0),
    pct: (row.leadCount / marketMax) * 100,
    flag: marketFlags[index] ?? '🌍',
    growth: [22.4, 18.7, 15.6, 14.2, 35][index] ?? 12,
  }));
  const productRows: ProductRow[] = data.productBreakdown.slice(0, 5).map((row, index) => {
    const visual = productVisuals[index] ?? { Icon: Package, tone: 'blue' as Tone };
    return {
      name: row.category,
      value: row.pipelineValueUsd || row.leadCount * avgLeadValue,
      quotes: row.activeQuotes,
      pct: ((row.pipelineValueUsd || row.leadCount * avgLeadValue) / productTotal) * 100,
      Icon: visual.Icon,
      tone: visual.tone,
    };
  });
  const revenueWon = om.totalValueUsd || wonValue;

  return (
    <main className="space-y-6">
      <AnalyticsShellHeader mode={mode} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KPI label="Pipeline Value" value={money(data.pipelineValueUsd)} delta="18.6% vs previous period" icon={TrendingUp} tone="blue" href="/pipeline" />
        <KPI label="Quotes Sent" value={fmt(qm.totalSent)} delta="12.4% active" icon={Mail} tone="green" href="/quotes" />
        <KPI label="Conversion Rate" value={pct(conversionRate)} delta="6.3% improving" icon={Target} tone="purple" href="/reports" />
        <KPI label="Orders Won" value={fmt(om.completed)} delta="22.6% won" icon={Trophy} tone="orange" href="/orders" />
        <KPI label="Revenue Won" value={money(revenueWon)} delta="15.8% collected" icon={CircleDollarSign} tone="teal" href="/orders" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.85fr_1.05fr]">
        <ConversionFunnel data={data} />
        <PipelineMovement rows={movementRows} />
        <TopMarkets rows={marketRows} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <TopProducts rows={productRows} />
        <Insights data={data} stalledValue={stalledValue} />
      </section>

      <MarketStrip rows={marketRows} />
    </main>
  );
}
