import Link from 'next/link';
import { SectionCard } from '@/components/ui/section-card';
import { StateMessage } from '@/components/ui/state-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { AdminPageHero, AdminSettingsShell, type AdminGapItem } from '@/features/admin/components/admin-settings-shell';
import { getLiveOrgHealthRows, type OrgHealthRow } from '@/features/client-onboarding/server/org-health';
import { hasSupabaseEnv } from '@/lib/env';
import { requireSetuInternalAdminWorkspace } from '@/lib/workspace/auth';

function formatDate(value: string | null) {
  if (!value) return 'No activity yet';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function statusLabel(value: string) {
  return value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function statusTone(value: string): 'success' | 'warning' | 'info' | 'neutral' | 'danger' {
  if (value === 'live') return 'success';
  if (value === 'paused') return 'danger';
  if (value.includes('progress') || value.includes('ready') || value.includes('invited')) return 'info';
  if (value === 'submitted') return 'warning';
  return 'neutral';
}

function scoreClasses(tone: OrgHealthRow['healthTone']) {
  if (tone === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  if (tone === 'warning') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-rose-200 bg-rose-50 text-rose-900';
}

function HealthBar({ score, tone }: { score: number; tone: OrgHealthRow['healthTone'] }) {
  const fill = tone === 'success' ? 'bg-emerald-500' : tone === 'warning' ? 'bg-amber-500' : 'bg-rose-500';
  return <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${fill}`} style={{ width: `${score}%` }} /></div>;
}

function HealthSignalList({ label, values, empty }: { label: string; values: string[]; empty: string }) {
  return <div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">{label}</p><div className="mt-2 flex flex-wrap gap-1.5">{values.length ? values.slice(0, 4).map((value) => <span key={value} className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600">{value}</span>) : <span className="text-xs font-semibold text-slate-400">{empty}</span>}{values.length > 4 ? <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">+{values.length - 4}</span> : null}</div></div>;
}

function MetricCard({ label, value, tone = 'info' }: { label: string; value: string | number; tone?: 'success' | 'warning' | 'info' | 'danger' }) {
  const styles = tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-900' : tone === 'danger' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-blue-200 bg-blue-50 text-blue-900';
  return <div className={`rounded-3xl border p-4 ${styles}`}><p className="text-2xl font-bold tracking-tight">{value}</p><p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.16em] opacity-75">{label}</p></div>;
}

function OrgHealthCard({ row }: { row: OrgHealthRow }) {
  return <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-sm font-black text-slate-500">{row.logoUrl ? <img src={row.logoUrl} alt="" className="h-full w-full object-contain p-1" /> : row.name.slice(0, 2).toUpperCase()}</div><div className="min-w-0"><h3 className="truncate text-base font-bold text-slate-950">{row.name}</h3><p className="truncate text-xs font-semibold text-slate-500">/{row.slug}</p></div></div>
      <div className="flex flex-wrap items-center gap-2"><StatusBadge label={statusLabel(row.onboardingStatus)} tone={statusTone(row.onboardingStatus)} dot={false} /><Link href={`/admin/client-management?client=${encodeURIComponent(row.id)}`} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Manage</Link></div>
    </div>
    <div className="mt-5 grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]"><div className={`rounded-3xl border p-4 ${scoreClasses(row.healthTone)}`}><p className="text-4xl font-black tracking-tight">{row.healthScore}</p><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] opacity-75">Health score</p><div className="mt-3"><HealthBar score={row.healthScore} tone={row.healthTone} /></div></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><MetricCard label="Owners" value={row.counts.activeOwners} tone={row.counts.activeOwners ? 'success' : 'warning'} /><MetricCard label="Products" value={row.counts.products} tone={row.counts.products ? 'success' : 'warning'} /><MetricCard label="Recent leads" value={row.counts.recentLeads} tone={row.counts.recentLeads ? 'success' : 'danger'} /><MetricCard label="Quotes" value={row.counts.quotes} tone={row.counts.quotes ? 'success' : 'warning'} /></div></div>
    <div className="mt-5 grid gap-4 lg:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Last active</p><p className="mt-1 text-sm font-bold text-slate-800">{formatDate(row.lastActiveAt)}</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Modules</p><p className="mt-1 truncate text-sm font-bold text-slate-800">{row.moduleSummary}</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Markets</p><p className="mt-1 text-sm font-bold text-slate-800">{row.counts.markets || 'Default only'}</p></div></div>
    <div className="mt-5 grid gap-4 lg:grid-cols-2"><HealthSignalList label="Healthy signals" values={row.completedSignals} empty="No completed signals" /><HealthSignalList label="Needs attention" values={row.missingSignals} empty="No gaps detected" /></div>
  </article>;
}

export default async function ClientOnboardingMonitorPage() {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure Supabase before using the client onboarding monitor." tone="warning" />;
  const { missingEnv, organization } = await requireSetuInternalAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure Supabase before using the client onboarding monitor." tone="warning" />;
  if (!organization) return null;

  const { rows, error } = await getLiveOrgHealthRows(organization.id);
  const atRisk = rows.filter((row) => row.healthScore < 45).length;
  const watch = rows.filter((row) => row.healthScore >= 45 && row.healthScore < 75).length;
  const healthy = rows.filter((row) => row.healthScore >= 75).length;
  const average = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.healthScore, 0) / rows.length) : 0;
  const gapItems: AdminGapItem[] = error ? [{ icon: '⚙️', text: 'Check client onboarding monitor query', href: '/admin/client-onboarding' }] : [];

  return <AdminSettingsShell active="client-management" organizationName={organization.name} missingCount={gapItems.length} sectionTitle="Client health" gapItems={gapItems}>
    <AdminPageHero title="Live Org Health" description="Superadmin monitor for live workspaces, adoption gaps, last activity, and module coverage." badge="Sprint 19" cta={<Link href="/admin/client-management" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Open client management</Link>} stats={[{ label: 'Average health', value: average, tone: average >= 75 ? 'success' : average >= 45 ? 'warning' : 'danger' }, { label: 'Healthy', value: healthy, tone: 'success' }, { label: 'Watch', value: watch, tone: watch ? 'warning' : 'default' }, { label: 'At risk', value: atRisk, tone: atRisk ? 'danger' : 'default' }]} />
    {error ? <StateMessage title="Live org health needs attention" description={error} tone="warning" /> : null}
    <SectionCard eyebrow="Live monitoring" title="Workspace health scores" description="Score is computed server-side from profile completeness, owner assignment, products, markets, recent lead activity, quotes, and approval threshold setup.">
      {rows.length ? <div className="space-y-4">{rows.map((row) => <OrgHealthCard key={row.id} row={row} />)}</div> : <StateMessage title="No client organizations found" description="Provision a client workspace before health scores can be calculated." tone="info" />}
    </SectionCard>
  </AdminSettingsShell>;
}
