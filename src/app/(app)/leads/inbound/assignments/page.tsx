import Link from 'next/link';

import { PendingSubmitButton } from '@/features/integrations/interakt/components/pending-submit-button';
import { readStarkInboundAssignmentManager, reassignStarkInboundLead } from '@/features/integrations/interakt/assignment-management';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { WorkspaceState } from '@/components/ui/workspace-state';

const STARK_PACKMATE_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const STARK_PACKMATE_SLUG = 'starkpackmate';
const MANAGER_ROLES = new Set(['owner', 'manager', 'admin']);

type SearchParams = { q?: string };

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default async function InboundAssignmentsPage({ searchParams = {} }: { searchParams?: SearchParams }) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return <WorkspaceState eyebrow="Inbound assignments" title="Workspace membership needed" description="Sign in to your Stark Packmate workspace to manage inbound ownership." primaryActionHref="/leads" primaryActionLabel="Back to Leads" />;
  }

  const isStark = workspace.organization.id === STARK_PACKMATE_ORG_ID || String(workspace.organization.slug ?? '').toLowerCase() === STARK_PACKMATE_SLUG;
  const canManage = workspace.currentRoles.some((role) => MANAGER_ROLES.has(String(role).toLowerCase()));
  if (!isStark || !canManage) {
    return <WorkspaceState eyebrow="Inbound assignments" title="Manager access required" description="Only Stark Packmate Owners, Managers and Admins can change inbound lead assignments." primaryActionHref="/leads/inbound" primaryActionLabel="Back to Inbound" />;
  }

  const q = String(searchParams.q ?? '').trim();
  const data = await readStarkInboundAssignmentManager({ q });

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Link href="/leads" className="hover:text-slate-900">Leads</Link><span>›</span><Link href="/leads/inbound" className="hover:text-slate-900">Inbound</Link><span>›</span><span>Assignments</span></div>
          <h1 className="mt-2 text-2xl font-black text-slate-950">Manage inbound assignments</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">Owners and Managers can move an inbound inquiry to another eligible Sales user. Every change is written to the audit log.</p>
        </div>
        <Link href="/leads/inbound" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50">← Back to Inbound</Link>
      </div>

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm font-black text-blue-950">Eligible Sales pool</p><p className="mt-1 text-xs text-blue-800">Active Sales users can receive and work leads immediately. Pending Sales seats may receive inbound inquiries and ownership resolves when the invitation is accepted.</p></div>
          <div className="flex flex-wrap gap-2">{data.assignees.map((assignee) => <span key={assignee.key} className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-[11px] font-bold text-blue-900">{assignee.name}{assignee.status === 'pending' ? ' · Pending' : ' · Active'}</span>)}</div>
        </div>
      </section>

      <form method="get" className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <input name="q" defaultValue={q} placeholder="Search contact, company, phone or salesperson" className="min-w-[280px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <button className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white">Search</button>
        {q ? <Link href="/leads/inbound/assignments" className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Clear</Link> : null}
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3"><p className="text-sm font-black text-slate-900">Inbound ownership</p><p className="mt-0.5 text-[11px] text-slate-500">Showing up to 250 active inbound inquiries{q ? ` matching “${q}”` : ''}.</p></div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500"><tr><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Company</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Current owner</th><th className="px-4 py-3">Last inbound</th><th className="px-4 py-3">Reassign</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.rows.map((row: any) => {
                const currentKey = row.setu_assigned_user_id ? `user:${row.setu_assigned_user_id}` : row.setu_assigned_invitation_id ? `invite:${row.setu_assigned_invitation_id}` : '';
                return <tr key={row.id} className="align-top hover:bg-slate-50/60">
                  <td className="px-4 py-3"><Link href={`/leads/inbound?review=${row.id}`} className="text-sm font-bold text-slate-950 hover:text-blue-700">{row.person_name || row.contact_name || 'Unnamed contact'}</Link><p className="mt-0.5 text-[11px] text-slate-500">{row.full_phone_number || 'No phone'}</p></td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-700">{row.company_name || 'Not confirmed'}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">{row.intake_status || 'new'}</span></td>
                  <td className="px-4 py-3"><p className="text-xs font-bold text-slate-800">{row.setu_assigned_name || 'Unassigned'}</p>{row.setu_assigned_email ? <p className="mt-0.5 text-[10px] text-slate-500">{row.setu_assigned_email}</p> : null}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{formatDate(row.last_inbound_at || row.source_modified_at)}</td>
                  <td className="px-4 py-3">
                    <form action={reassignStarkInboundLead} className="flex min-w-[260px] items-center gap-2">
                      <input type="hidden" name="rowId" value={row.id} />
                      <select name="targetKey" defaultValue={currentKey} required className="min-w-[170px] flex-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs">
                        <option value="" disabled>Select salesperson</option>
                        {data.assignees.map((assignee) => <option key={assignee.key} value={assignee.key}>{assignee.name}{assignee.status === 'pending' ? ' (Pending)' : ''}</option>)}
                      </select>
                      <PendingSubmitButton idleLabel="Save" pendingLabel="Saving…" className="rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-black text-white" />
                    </form>
                  </td>
                </tr>;
              })}
              {!data.rows.length ? <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">No active inbound inquiries match this search.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
