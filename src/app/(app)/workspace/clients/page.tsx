import Link from 'next/link';
import { getWorkspaceIssues } from '@/lib/queries/workspace';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { SmcMetricCard, daysOld, isClosedIssue } from '@/features/workspace/components/smc-shell';
import { appendSmcQuery, filterIssuesForSmc, normalizeSmcFilters, type SmcFilterInput } from '@/features/workspace/filters';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

export const dynamic = 'force-dynamic';

async function getOrganizations() {
  const admin = createAdminSupabaseClient();
  const supabase = admin ?? await createClient();
  const { data } = await (supabase as any).from('organizations').select('id,name,slug').order('name');
  return (data ?? []) as { id: string; name: string; slug: string }[];
}

export default async function ClientsPage({ searchParams }: { searchParams?: SmcFilterInput }) {
  const [allIssues, orgs] = await Promise.all([getWorkspaceIssues(), getOrganizations()]);
  const filters = normalizeSmcFilters(searchParams);
  const issues = filterIssuesForSmc(allIssues, filters);
  const setuOrgId = INTERNAL_ORG_ID;
  const clientOrgs = orgs.filter((o) => o.id !== setuOrgId);
  const clientIssues = issues.filter((i) => i.client_org_id != null);
  const unlinkedOpen = issues.filter((i) => !i.client_org_id && !isClosedIssue(i.status));
  const clientOpen = clientIssues.filter((i) => !isClosedIssue(i.status));
  const oldestUnlinked = [...unlinkedOpen].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
  const highClientRisk = clientOpen.filter((i) => ['Critical', 'High'].includes(i.severity ?? ''));

  return (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/55">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0c7fff] dark:text-violet-300">Setu Mission Control</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Client Impact</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Global SMC filters apply to client risk, unlinked issues, and attribution cleanup.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SmcMetricCard icon="client" label="Client orgs" value={clientOrgs.length} sub="non-SETU organizations" tone="text-slate-950 dark:text-white" />
        <SmcMetricCard icon="board" label="Client issues" value={clientIssues.length} sub="linked to client_org_id" tone="text-blue-600 dark:text-blue-300" />
        <SmcMetricCard icon="risk" label="Client open risk" value={clientOpen.length} sub={`${highClientRisk.length} high/critical`} tone="text-amber-600 dark:text-amber-300" />
        <SmcMetricCard icon="shield" label="Unlinked open" value={unlinkedOpen.length} sub="needs attribution" tone="text-red-600 dark:text-red-300" />
        <SmcMetricCard icon="clock" label="Oldest unlinked" value={oldestUnlinked ? `${daysOld(oldestUnlinked.created_at)}d` : '—'} sub={oldestUnlinked?.issue_ref ?? 'none'} tone="text-violet-600 dark:text-violet-300" />
      </div>

      {unlinkedOpen.length ? (
        <section className="rounded-[1.75rem] border border-amber-200/80 bg-amber-50/80 p-5 dark:border-amber-400/20 dark:bg-amber-500/10">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">Attribution cleanup</p><h2 className="mt-1 text-xl font-black text-amber-950 dark:text-amber-50">{unlinkedOpen.length} filtered open issues are not linked to a client</h2><p className="mt-1 text-sm text-amber-800/80 dark:text-amber-100/70">Use the issue drawer to set client_org_id when an issue is buyer/supplier/client-impacting.</p></div><Link href={appendSmcQuery('/workspace/issues', filters)} className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-amber-600">Open issue board</Link></div>
        </section>
      ) : null}

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 shadow-sm dark:border-white/10 dark:bg-slate-950/55">
        <div className="border-b border-slate-200/80 px-5 py-4 dark:border-white/10"><h2 className="text-lg font-black text-slate-950 dark:text-white">Client organizations</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Open, high-risk, resolved, and oldest-open readiness issues by client under the active filter.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="bg-slate-50/90 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 dark:bg-white/[0.04] dark:text-slate-400"><tr><th className="px-5 py-3 text-left">Organization</th><th className="px-5 py-3 text-left">Open</th><th className="px-5 py-3 text-left">High risk</th><th className="px-5 py-3 text-left">Resolved</th><th className="px-5 py-3 text-left">Oldest open</th></tr></thead><tbody className="divide-y divide-slate-200/80 dark:divide-white/10">{clientOrgs.map((org) => { const orgIssues = clientIssues.filter((i) => i.client_org_id === org.id); const orgOpen = orgIssues.filter((i) => !isClosedIssue(i.status)); const orgResolved = orgIssues.filter((i) => ['Resolved', "Won't Fix"].includes(i.status ?? '')); const orgHigh = orgOpen.filter((i) => ['Critical', 'High'].includes(i.severity ?? '')); const oldest = [...orgOpen].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]; return (<tr key={org.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.035]"><td className="px-5 py-3 font-bold text-slate-900 dark:text-slate-100">{org.name}</td><td className="px-5 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-black ${orgOpen.length ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'}`}>{orgOpen.length}</span></td><td className="px-5 py-3 text-slate-500 dark:text-slate-400">{orgHigh.length}</td><td className="px-5 py-3 text-slate-500 dark:text-slate-400">{orgResolved.length}</td><td className="px-5 py-3 text-slate-500 dark:text-slate-400">{oldest ? `${daysOld(oldest.created_at)}d ago` : '—'}</td></tr>); })}{!clientOrgs.length ? <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">No client organizations found</td></tr> : null}</tbody></table></div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/55"><p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0c7fff] dark:text-violet-300">Client-linked issues</p><div className="mt-4 space-y-2">{clientIssues.slice(0, 12).map((issue) => { const clientOrg = clientOrgs.find((o) => o.id === issue.client_org_id); return (<Link key={issue.id} href={`/workspace/issues?ref=${issue.issue_ref}`} className="block rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-[#0c7fff]/30 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"><div className="flex items-center justify-between gap-3"><span className="font-mono text-[10px] font-bold text-slate-400">{issue.issue_ref}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-white/[0.08] dark:text-slate-300">{issue.status}</span></div><p className="mt-1 line-clamp-1 text-sm font-bold text-slate-900 dark:text-white">{issue.title}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{clientOrg?.name ?? 'Unknown client'}</p></Link>); })}{!clientIssues.length ? <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-white/10">No client-linked issues match this filter.</p> : null}</div></div>
        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/55"><p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0c7fff] dark:text-violet-300">Unlinked open issues</p><div className="mt-4 space-y-2">{unlinkedOpen.slice(0, 12).map((issue) => (<Link key={issue.id} href={`/workspace/issues?ref=${issue.issue_ref}`} className="block rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-amber-300 hover:bg-amber-50/50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-amber-500/10"><div className="flex items-center justify-between gap-3"><span className="font-mono text-[10px] font-bold text-slate-400">{issue.issue_ref}</span><span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">{issue.severity}</span></div><p className="mt-1 line-clamp-1 text-sm font-bold text-slate-900 dark:text-white">{issue.title}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{daysOld(issue.created_at)}d old · {issue.area ?? issue.workflow_area ?? 'Other'}</p></Link>))}{!unlinkedOpen.length ? <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-white/10">All filtered open issues are attributed.</p> : null}</div></div>
      </section>
    </div>
  );
}
