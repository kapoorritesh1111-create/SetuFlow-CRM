import Link from 'next/link';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getDashboardData } from '@/lib/queries/dashboard';

export default async function MobileDashboardPage() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return <div className="rounded-2xl bg-white/90 p-6 text-center"><p className="text-sm font-bold text-slate-600">Sign in to view dashboard</p></div>;
  }

  let data: any = null;
  try { data = await getDashboardData(workspace.organization.id); } catch {}

  const overdueCount = data?.overdueFollowUpCount ?? 0;
  const todayCount = data?.todayFollowUpCount ?? 0;
  const pipelineValue = data?.totalPipelineValue ?? 0;
  const wonThisMonth = data?.wonThisMonthValue ?? 0;
  const fmt = (n: number) => n >= 1000 ? `${'$'}${(n/1000).toFixed(0)}K` : n > 0 ? `${'$'}${n}` : '—';

  const kpis = [
    { label: 'Overdue', value: overdueCount, sub: 'follow-ups', href: '/leads?timing=overdue', accent: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
    { label: 'Due Today', value: todayCount, sub: 'follow-ups', href: '/leads?timing=today', accent: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    { label: 'Pipeline', value: fmt(pipelineValue), sub: 'active value', href: '/pipeline', accent: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
    { label: 'Won (month)', value: fmt(wonThisMonth), sub: 'this month', href: '/reports', accent: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-hero bg-[linear-gradient(145deg,#0c172d,#122241)] p-5 text-white shadow-xl">
        <p className="text-xs font-black uppercase tracking-[.18em] text-sky-200">Dashboard</p>
        <h1 className="mt-1 text-2xl font-black">Today's summary</h1>
        <p className="text-xs text-slate-400 mt-0.5">{workspace.organization.name}</p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        {kpis.map(kpi => (
          <Link key={kpi.label} href={kpi.href}
            className={`rounded-2xl border p-4 active:scale-[.98] transition ${kpi.bg}`}>
            <div className={`w-1.5 h-6 rounded-full ${kpi.accent} mb-2`} />
            <p className={`text-2xl font-black ${kpi.text}`}>{kpi.value}</p>
            <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-slate-500 mt-0.5">{kpi.label}</p>
            <p className="text-[10px] text-slate-400">{kpi.sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-2">
        <Link href="/leads" className="flex items-center gap-3 rounded-2xl bg-white/90 p-4 shadow-sm active:scale-[.98] transition">
          <span className="text-xl">◎</span>
          <div><p className="font-bold text-slate-900 text-sm">Follow-up queue</p><p className="text-[11px] text-slate-500">Review and action overdue leads</p></div>
          <span className="ml-auto text-slate-300">›</span>
        </Link>
        <Link href="/pipeline" className="flex items-center gap-3 rounded-2xl bg-white/90 p-4 shadow-sm active:scale-[.98] transition">
          <span className="text-xl">⊞</span>
          <div><p className="font-bold text-slate-900 text-sm">Pipeline board</p><p className="text-[11px] text-slate-500">Stage-by-stage deal view</p></div>
          <span className="ml-auto text-slate-300">›</span>
        </Link>
      </div>
    </div>
  );
}
