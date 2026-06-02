import { PageHeader } from '@/components/ui/page-header';
import { getWorkspaceIssues } from '@/lib/queries/workspace';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { workspaceTableShellClass, workspaceMetricClass } from '@/components/ui/workspace-surfaces';

export const dynamic = 'force-dynamic';

async function getOrganizations() {
  const admin = createAdminSupabaseClient();
  const supabase = admin ?? await createClient();
  const { data } = await (supabase as any).from('organizations').select('id,name,slug').order('name');
  return (data ?? []) as { id: string; name: string; slug: string }[];
}

export default async function ClientsPage() {
  const [issues, orgs] = await Promise.all([getWorkspaceIssues(), getOrganizations()]);

  const clientOrgs = orgs.filter((o) => o.id !== '3327b9a7-aadb-44b0-9793-30c4045d3c92');

  // Issues linked to clients (reporter or client_org_id)
  const clientIssues = issues.filter((i) => i.client_org_id != null);
  const unlinkedOpen = issues.filter((i) => !i.client_org_id && !['Resolved', "Won't Fix", 'Deferred'].includes(i.status ?? ''));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Engineering workspace"
        title="Client Issues"
        description="Issues linked to specific client organizations. Track SLA status and what's been fixed per client."
        actions={[
          { label: 'Issue Board', href: '/workspace/issues' },
        ]}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className={workspaceMetricClass}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Client Orgs</p>
          <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-50">{clientOrgs.length}</p>
        </div>
        <div className={workspaceMetricClass}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Client Issues</p>
          <p className="mt-1 text-3xl font-bold text-blue-600 dark:text-blue-400">{clientIssues.length}</p>
        </div>
        <div className={workspaceMetricClass}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Unlinked Open</p>
          <p className="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">{unlinkedOpen.length}</p>
          <p className="text-[11px] text-slate-400">not attributed to a client</p>
        </div>
      </div>

      {/* Client orgs */}
      <div className={workspaceTableShellClass}>
        <div className="border-b border-slate-200/80 px-5 py-3 dark:border-slate-700/70">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Client Organizations</h3>
          <p className="text-[11px] text-slate-400">Link issues to clients by setting client_org_id on any issue in the Issue Board</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50/90 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:bg-slate-800/80 dark:text-slate-300">
            <tr>
              <th className="px-5 py-3 text-left">Organization</th>
              <th className="px-5 py-3 text-left">Open Issues</th>
              <th className="px-5 py-3 text-left">Resolved</th>
              <th className="px-5 py-3 text-left">Oldest Open</th>
            </tr>
          </thead>
          <tbody>
            {clientOrgs.map((org) => {
              const orgIssues = clientIssues.filter((i) => i.client_org_id === org.id);
              const orgOpen = orgIssues.filter((i) => !['Resolved', "Won't Fix", 'Deferred'].includes(i.status ?? ''));
              const orgResolved = orgIssues.filter((i) => ['Resolved', "Won't Fix"].includes(i.status ?? ''));
              const oldest = orgOpen.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
              const oldestDays = oldest
                ? Math.floor((Date.now() - new Date(oldest.created_at).getTime()) / 86400000)
                : null;

              return (
                <tr key={org.id} className="border-b border-slate-200/80 hover:bg-slate-50 dark:border-slate-700/70 dark:hover:bg-slate-800/50">
                  <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{org.name}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-bold ${orgOpen.length > 0 ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' : 'bg-green-100 text-green-700'}`}>
                      {orgOpen.length}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{orgResolved.length}</td>
                  <td className="px-5 py-3 text-slate-500">
                    {oldestDays !== null ? (
                      <span className={`text-xs ${oldestDays > 14 ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>
                        {oldestDays}d ago
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
            {clientOrgs.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">No client organizations found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Recently filed by clients */}
      {clientIssues.length > 0 && (
        <div className={workspaceTableShellClass}>
          <div className="border-b border-slate-200/80 px-5 py-3 dark:border-slate-700/70">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Client-Linked Issues</h3>
          </div>
          <div className="divide-y divide-slate-200/80 dark:divide-slate-700/70">
            {clientIssues.slice(0, 20).map((issue) => {
              const clientOrg = clientOrgs.find((o) => o.id === issue.client_org_id);
              return (
                <div key={issue.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <code className="font-mono text-[10px] text-slate-400 w-24 flex-shrink-0">{issue.issue_ref}</code>
                  <span className="flex-1 text-sm text-slate-700 dark:text-slate-200 line-clamp-1">{issue.title}</span>
                  <span className="flex-shrink-0 rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {clientOrg?.name ?? 'Unknown client'}
                  </span>
                  <span className={`flex-shrink-0 rounded px-2 py-0.5 text-[10px] font-medium ${issue.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {issue.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
