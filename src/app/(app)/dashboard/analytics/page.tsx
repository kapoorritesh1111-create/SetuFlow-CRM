import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getAnalyticsData } from '@/lib/queries/analytics';
import type { AnalyticsData } from '@/lib/queries/analytics';
import { hasSupabaseEnv } from '@/lib/env';
import { parseWorkspaceMode } from '@/features/workspace/mode';
import type { WorkspaceMode } from '@/features/workspace/types';

function fmt(n: number) {
  return n.toLocaleString('en-US');
}

function pct(n: number) {
  return `${Math.round(n * 10) / 10}%`;
}

function money(value: number) {
  return `USD ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function modeLabel(mode: WorkspaceMode) {
  if (mode === 'buyers') return 'Buyer view';
  if (mode === 'suppliers') return 'Supplier view';
  return 'All workspace view';
}

function IconBubble({ children, tone }: { children: React.ReactNode; tone: 'green' | 'blue' | 'orange' | 'purple' | 'whatsapp' }) {
  const toneClass = {
    green: 'from-emerald-500 to-green-600',
    blue: 'from-blue-500 to-sky-600',
    orange: 'from-orange-500 to-amber-500',
    purple: 'from-violet-500 to-purple-600',
    whatsapp: 'from-green-400 to-emerald-600',
  }[tone];
  return <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br ${toneClass} text-lg text-white shadow-lg shadow-slate-200`}>{children}</span>;
}

function KPI({ label, value, delta, icon, tone, href }: { label: string; value: string; delta: string; icon: React.ReactNode; tone: 'green' | 'blue' | 'orange' | 'purple' | 'whatsapp'; href?: string }) {
  const card = (
    <div className="rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,23,42,0.09)]">
      <div className="flex items-center gap-4">
        <IconBubble tone={tone}>{icon}</IconBubble>
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-sm font-bold text-slate-800">{label}<span className="text-slate-300">ⓘ</span></div>
          <div className="mt-1 text-2xl font-black tracking-tight text-slate-950">{value}</div>
          <div className="mt-1 text-xs font-semibold text-emerald-600">↗ {delta}</div>
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

function Funnel({ funnel }: { funnel: AnalyticsData['funnel'] }) {
  const stages = funnel.map((stage) => ({ ...stage, label: stage.label.replace('Total Leads', 'Lead').replace('Order Created', 'Order').replace('Paid & Closed', 'Closed') }));
  return (
    <section className="rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-slate-900">Conversion funnel <span className="text-slate-300">ⓘ</span></h2>
        <span className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600">Live scope</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
        <div className="flex flex-col items-center justify-center gap-2 py-2">
          {stages.map((stage, index) => {
            const width = Math.max(34, 100 - index * 13);
            const shade = ['bg-blue-600', 'bg-blue-500', 'bg-blue-400', 'bg-blue-300', 'bg-blue-100'][index] ?? 'bg-blue-100';
            return <Link href={stage.href} key={stage.label} className={`${shade} h-10 rounded-md text-white shadow-sm`} style={{ width: `${width}%`, clipPath: 'polygon(7% 0, 93% 0, 82% 100%, 18% 100%)' }} aria-label={stage.label} />;
          })}
        </div>
        <div className="space-y-2">
          {stages.map((stage, index) => (
            <Link href={stage.href} key={stage.label} className="grid grid-cols-[1fr_auto] items-center rounded-xl px-2 py-1.5 text-sm hover:bg-slate-50">
              <span className="font-bold text-slate-700">{stage.label}</span>
              <span className="font-black text-slate-900">{fmt(stage.count)}</span>
              {index > 0 ? <span className="col-span-2 justify-self-end rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-600">{stage.pct}%</span> : <span className="col-span-2 justify-self-end text-[11px] text-slate-400">baseline</span>}
            </Link>
          ))}
        </div>
      </div>
      <Link href="/pipeline" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-600">View funnel report →</Link>
    </section>
  );
}

function PipelineChart({ funnel }: { funnel: AnalyticsData['funnel'] }) {
  const stages = funnel.slice(0, 5).map((stage) => ({
    label: stage.label.replace('Total Leads', 'Leads').replace('Order Created', 'Orders').replace('Paid & Closed', 'Closed'),
    count: stage.count,
    pct: stage.pct,
  }));
  const values = stages.map((stage) => stage.count);
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = 36 + index * 110;
    const y = 154 - (value / max) * 104;
    return `${x},${y}`;
  }).join(' ');
  return (
    <section className="rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-slate-900">Pipeline movement <span className="text-slate-300">ⓘ</span></h2>
        <span className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600">Funnel stage count</span>
      </div>
      <div className="overflow-hidden rounded-2xl bg-gradient-to-b from-white to-blue-50/60 p-3">
        <svg viewBox="0 0 540 230" className="h-56 w-full" role="img" aria-label="Pipeline movement by business stage">
          {[48, 86, 124, 162].map((y) => <line key={y} x1="22" x2="510" y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />)}
          <polyline points={points} fill="none" stroke="#0c7fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <polygon points={`${points} 500,180 36,180`} fill="rgba(12,127,255,.10)" />
          {stages.map((stage, index) => {
            const x = 36 + index * 110;
            const y = 154 - (stage.count / max) * 104;
            return (
              <g key={stage.label}>
                <circle cx={x} cy={y} r="5" fill="#0c7fff" />
                <text x={x} y={y - 12} textAnchor="middle" fontSize="12" fontWeight="700" fill="#0f172a">{stage.count}</text>
                <text x={x} y="204" textAnchor="middle" fontSize="11" fontWeight="700" fill="#475569">{stage.label}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500"><span className="h-2 w-2 rounded-full bg-blue-500" /> Shows real business stages in the current Buyer/Supplier/All scope.</div>
    </section>
  );
}

function RankingCard({ title, action, rows, href }: { title: string; action: string; href: string; rows: Array<{ name: string; value: string; pct: number; flag?: string }> }) {
  return (
    <section className="rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-slate-900">{title} <span className="text-slate-300">ⓘ</span></h2>
        <span className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600">{action}</span>
      </div>
      <div className="space-y-3">
        {rows.length ? rows.map((row) => (
          <div key={row.name} className="grid grid-cols-[1fr_auto] gap-3 text-sm">
            <div className="font-bold text-slate-700">{row.flag ? <span className="mr-2">{row.flag}</span> : null}{row.name}</div>
            <div className="font-bold text-slate-600">{row.value}</div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-300" style={{ width: `${Math.max(6, row.pct)}%` }} /></div>
            <div className="text-xs font-bold text-slate-500">{pct(row.pct)}</div>
          </div>
        )) : <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-400">No segmented data available yet.</div>}
      </div>
      <Link href={href} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-600">View all →</Link>
    </section>
  );
}

function Insights({ data }: { data: AnalyticsData }) {
  const winRate = data.quoteMetrics.winRate;
  const openRate = data.docSendMetrics.openRate;
  const delayed = Math.max(0, data.orderMetrics.active - data.orderMetrics.dispatched);
  const rows = [
    { icon: '↗', title: 'Pipeline growth', body: `${fmt(data.funnel[0]?.count ?? 0)} leads and ${fmt(data.orderMetrics.totalActive)} orders are currently visible in this scope.`, tag: 'Live', tone: 'emerald' },
    { icon: '⚠', title: 'Quote acceptance watch', body: `Quote acceptance rate is ${winRate}%. Review pricing and response times where needed.`, tag: winRate >= 30 ? 'Watch' : 'Action', tone: 'amber' },
    { icon: '⚡', title: 'WhatsApp engagement', body: `${fmt(data.docSendMetrics.whatsappSends)} WhatsApp tracked links and ${openRate}% total document open rate are recorded in the last 90 days.`, tag: 'Live', tone: 'emerald' },
    { icon: 'ⓘ', title: 'Orders delayed', body: `${fmt(delayed)} orders remain active before dispatched/closed status. Follow up to avoid further delay.`, tag: delayed ? 'Action' : 'Clear', tone: delayed ? 'blue' : 'emerald' },
  ];
  return (
    <section className="rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)] xl:col-span-2">
      <h2 className="mb-3 text-base font-black text-slate-900">Insights & anomalies <span className="text-slate-300">ⓘ</span></h2>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.title} className="grid gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
            <span className={`grid h-8 w-8 place-items-center rounded-full ${row.tone === 'emerald' ? 'bg-emerald-50 text-emerald-600' : row.tone === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'} font-black`}>{row.icon}</span>
            <div><div className="font-black text-slate-800">{row.title}</div><div className="text-sm text-slate-500">{row.body}</div></div>
            <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${row.tone === 'emerald' ? 'bg-emerald-50 text-emerald-600' : row.tone === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>{row.tag}</span>
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
  const { quoteMetrics: qm, orderMetrics: om, docSendMetrics: dm } = data;
  const acceptanceRate = qm.totalSent ? (qm.totalAccepted / qm.totalSent) * 100 : 0;
  const executionRate = om.totalActive ? (om.active / om.totalActive) * 100 : 0;
  const marketMax = Math.max(...data.marketBreakdown.map((row) => row.leadCount), 1);
  const productMax = Math.max(...data.productBreakdown.map((row) => row.leadCount), 1);
  const marketFlags = ['🇺🇸', '🇮🇳', '🇬🇧', '🇦🇺', '🇨🇦', '🌍', '🌎', '🌏'];

  const marketRows = data.marketBreakdown.slice(0, 5).map((row, index) => ({
    name: row.market,
    value: `${fmt(row.leadCount)} leads`,
    pct: (row.leadCount / marketMax) * 100,
    flag: marketFlags[index] ?? '🌍',
  }));
  const productRows = data.productBreakdown.slice(0, 5).map((row) => ({
    name: row.category,
    value: `${fmt(row.activeQuotes)} quoted`,
    pct: (row.leadCount / productMax) * 100,
  }));

  return (
    <main className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs font-semibold text-slate-500">
        <span>{modeLabel(mode)}</span>
        <span>Last updated: {new Date(data.lastUpdated).toLocaleString('en-US')}</span>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KPI label="Pipeline value" value={money(data.pipelineValueUsd)} delta="live scoped value" icon="$" tone="green" href="/pipeline" />
        <KPI label="Quote acceptance rate" value={pct(acceptanceRate)} delta={`${qm.totalAccepted} accepted`} icon="⌁" tone="blue" href="/quotes" />
        <KPI label="Orders in execution" value={fmt(om.active)} delta={`${pct(executionRate)} active`} icon="▣" tone="orange" href="/orders" />
        <KPI label="Document sends" value={fmt(dm.totalSends)} delta={`${dm.openRate}% opened`} icon="✈" tone="purple" href="/orders" />
        <KPI label="WhatsApp response rate" value={`${dm.openRate}%`} delta={`${fmt(dm.whatsappSends)} tracked links`} icon="☘" tone="whatsapp" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.05fr_1fr]">
        <Funnel funnel={data.funnel} />
        <PipelineChart funnel={data.funnel} />
        <RankingCard title="Top markets by pipeline" action="Live scope" href="/leads" rows={marketRows} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <RankingCard title="Top products by pipeline" action="Live scope" href="/products" rows={productRows} />
        <Insights data={data} />
      </section>
    </main>
  );
}
