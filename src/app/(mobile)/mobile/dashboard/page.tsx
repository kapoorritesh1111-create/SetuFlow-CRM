import Link from 'next/link';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getDashboardData, type DashboardData } from '@/lib/queries/dashboard';
import type { RecentActivityItem } from '@/features/dashboard/types';

type MobileKpi = {
  label: string;
  value: string | number;
  sub: string;
  href: string;
  accent: string;
  text: string;
  bg: string;
};

type QuickAction = {
  label: string;
  sub: string;
  href: string;
  icon: string;
  tone: string;
};

function formatCurrency(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return value > 0 ? `$${value.toLocaleString()}` : '—';
}

function getKpiValue(data: DashboardData | null, id: DashboardData['kpis'][number]['id']) {
  return data?.kpis.find((kpi) => kpi.id === id)?.rawValue ?? 0;
}

function formatActivityTime(timestamp: string | null) {
  if (!timestamp) return 'Recently';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

function buildActivityTitle(activity: RecentActivityItem) {
  if (activity.companyName) return activity.companyName;
  if (activity.stageName) return activity.stageName;
  return activity.type.charAt(0).toUpperCase() + activity.type.slice(1);
}

export default async function MobileDashboardPage() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return <div className="rounded-2xl bg-white/90 p-6 text-center"><p className="text-sm font-bold text-slate-600">Sign in to view dashboard</p></div>;
  }

  let data: DashboardData | null = null;
  try {
    data = await getDashboardData(workspace.organization.id);
  } catch {
    data = null;
  }

  const overdueCount = getKpiValue(data, 'overdue-followups');
  const pipelineValue = getKpiValue(data, 'pipeline-value');
  const activeQuotes = getKpiValue(data, 'active-quotes');
  const openLeads = getKpiValue(data, 'open-leads');
  const today = new Date();
  const greetingHour = today.getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = workspace.membership.full_name?.split(' ')[0] ?? workspace.organization.name;
  const dateLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'short', day: 'numeric' }).format(today);

  const kpis: MobileKpi[] = [
    { label: 'Overdue', value: overdueCount, sub: 'follow-ups', href: '/leads?timing=overdue', accent: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
    { label: 'Due Today', value: openLeads, sub: 'open leads', href: '/leads?timing=today', accent: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    { label: 'Pipeline', value: formatCurrency(pipelineValue), sub: 'active value', href: '/pipeline', accent: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
    { label: 'Won (month)', value: activeQuotes, sub: 'active quotes', href: '/quotes', accent: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  ];

  const quickActions: QuickAction[] = [
    { label: 'Scan Card', sub: 'Capture contact', href: '/mobile/capture', icon: '▣', tone: 'bg-sky-100 text-sky-700' },
    { label: 'Quick Lead', sub: 'Add in seconds', href: '/leads?quickLead=1', icon: '+', tone: 'bg-emerald-100 text-emerald-700' },
    { label: 'New Quote', sub: 'Start pricing', href: '/mobile/quote', icon: '$', tone: 'bg-violet-100 text-violet-700' },
    { label: 'My Tasks', sub: 'Next actions', href: '/tasks', icon: '✓', tone: 'bg-amber-100 text-amber-700' },
  ];

  const activityItems = data?.recentActivity.slice(0, 5) ?? [];

  return (
    <div className="space-y-4 pb-8">
      <section className="rounded-[2rem] bg-[linear-gradient(145deg,#0c172d,#122241)] p-5 text-white shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-sky-200">Mobile home</p>
            <h1 className="mt-1 text-2xl font-black">{greeting}, {displayName}</h1>
            <p className="mt-1 text-xs text-slate-300">{dateLabel} · {workspace.organization.name}</p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-lg font-black ring-1 ring-white/20">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href}
            className={`rounded-2xl border p-4 shadow-sm transition active:scale-[.98] ${kpi.bg}`}>
            <div className={`mb-2 h-6 w-1.5 rounded-full ${kpi.accent}`} />
            <p className={`text-2xl font-black ${kpi.text}`}>{kpi.value}</p>
            <p className="mt-0.5 text-[10px] font-extrabold uppercase tracking-[.12em] text-slate-500">{kpi.label}</p>
            <p className="text-[10px] text-slate-400">{kpi.sub}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-[2rem] bg-white/90 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-blue-600">Quick actions</p>
            <h2 className="text-lg font-black text-slate-950">Move work forward</h2>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 transition active:scale-[.98]">
              <span className={`flex h-10 w-10 items-center justify-center rounded-2xl text-lg font-black ${action.tone}`}>{action.icon}</span>
              <p className="mt-3 text-sm font-black text-slate-900">{action.label}</p>
              <p className="text-[11px] text-slate-500">{action.sub}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] bg-white/90 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-slate-500">Activity feed</p>
            <h2 className="text-lg font-black text-slate-950">Latest movement</h2>
          </div>
          <Link href="/dashboard" className="text-xs font-black text-blue-600">View all</Link>
        </div>
        <div className="mt-3 grid gap-2">
          {activityItems.length ? activityItems.map((activity) => (
            <Link key={activity.id} href={activity.href ?? '/leads'} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 transition active:scale-[.98]">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-xs font-black text-white">{activity.iconKey.slice(0, 2).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-900">{buildActivityTitle(activity)}</p>
                <p className="truncate text-[11px] text-slate-500">{activity.message}</p>
              </div>
              <span className="text-[10px] font-bold text-slate-400">{formatActivityTime(activity.timestamp)}</span>
            </Link>
          )) : (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">No recent activity yet. New lead updates will appear here.</div>
          )}
        </div>
      </section>
    </div>
  );
}
