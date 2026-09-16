import Link from 'next/link';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { StateMessage } from '@/components/ui/state-message';
import { getWorkspaceAccess, hasWorkspaceRole } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationVerticals } from '@/lib/verticals/capability';
import { getPackagingDesignWork, type PackagingDesignQueueItem } from '@/lib/packaging/design-queue';
import { packagingDesignSourceLabel, packagingDesignStatusLabel } from '@/lib/packaging/design-proof';
import PackagingProofPanel from '@/features/packaging/components/packaging-proof-panel';
import DesignAssigneeControl from '@/features/packaging/components/design-assignee-control';
import { getPackagingDesignAssignees, type DesignAssignee } from '@/features/packaging/server/design-assignment-actions';

export const dynamic = 'force-dynamic';

function badgeClass(status: string) {
  if (status === 'revision_required') return 'bg-rose-100 text-rose-700';
  if (status === 'in_review') return 'bg-amber-100 text-amber-700';
  if (status === 'ready') return 'bg-emerald-100 text-emerald-700';
  return 'bg-cyan-100 text-cyan-700';
}

function dueLabel(item: PackagingDesignQueueItem) {
  const due = item.designRequest?.due_date;
  if (!due) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (due < today) return { label: 'Overdue', tone: 'bg-rose-100 text-rose-700' };
  if (due === today) return { label: 'Due today', tone: 'bg-rose-100 text-rose-700' };
  return { label: `Due ${due}`, tone: 'bg-slate-100 text-slate-600' };
}

function JobCard({ item, assignees, canManage, canClaim, currentUserId, compact = false }: {
  item: PackagingDesignQueueItem;
  assignees: DesignAssignee[];
  canManage: boolean;
  canClaim: boolean;
  currentUserId: string;
  compact?: boolean;
}) {
  const due = dueLabel(item);
  const assignedTo = item.designRequest?.assigned_to ?? null;
  const assignedName = assignees.find((person) => person.userId === assignedTo)?.name ?? null;
  return <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-black text-slate-900">{item.companyName ?? 'Unknown company'}</h3>
          {item.quoteNumber ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">{item.quoteNumber}</span> : null}
        </div>
        <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{item.specSummary ?? 'Packaging line'}</p>
      </div>
      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${badgeClass(item.designStatus)}`}>{packagingDesignStatusLabel(item.designStatus)}</span>
    </div>
    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold">
      <span className={`rounded-full px-2 py-1 ${assignedTo ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-500'}`}>{assignedName ?? 'Unassigned'}</span>
      {item.designRequest?.requested ? <span className="rounded-full bg-cyan-50 px-2 py-1 text-cyan-700">Sales request</span> : null}
      {item.designSource ? <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{packagingDesignSourceLabel(item.designSource)}</span> : null}
      {due ? <span className={`rounded-full px-2 py-1 ${due.tone}`}>{due.label}</span> : null}
    </div>
    {!compact ? <>
      {item.designRequest?.notes ? <p className="mt-2 rounded-xl bg-slate-50 p-2 text-[11px] font-semibold text-slate-600">{item.designRequest.notes}</p> : null}
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 pt-3">
        <DesignAssigneeControl quoteLineItemId={item.lineId} assignees={assignees} assignedTo={assignedTo} assignedName={assignedName} canManage={canManage} canClaim={canClaim} currentUserId={currentUserId} />
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500">{Number(item.quantity || 0).toLocaleString()} {item.sourceType === 'packaging_line' ? 'pcs' : 'unit(s)'}</span>
          {item.leadId ? <Link href={`/leads/${item.leadId}/quote?quoteId=${item.quoteId}`} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700">Open quote →</Link> : null}
        </div>
      </div>
      {item.leadId ? <PackagingProofPanel quoteLineItemId={item.lineId} leadId={item.leadId} /> : null}
    </> : null}
  </article>;
}

function Lane({ title, tone, items, assignees, canManage, canClaim, currentUserId }: {
  title: string; tone: string; items: PackagingDesignQueueItem[]; assignees: DesignAssignee[]; canManage: boolean; canClaim: boolean; currentUserId: string;
}) {
  return <section className={`min-w-[250px] flex-1 rounded-2xl border border-slate-200 ${tone} p-3`}>
    <div className="flex items-center justify-between"><h3 className="text-xs font-black uppercase tracking-wide text-slate-700">{title}</h3><span className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-slate-700">{items.length}</span></div>
    <div className="mt-3 space-y-2">{items.length ? items.slice(0, 8).map((item) => <JobCard key={item.lineId} item={item} assignees={assignees} canManage={canManage} canClaim={canClaim} currentUserId={currentUserId} compact />) : <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-4 text-center text-xs font-semibold text-slate-400">No jobs</div>}</div>
  </section>;
}

export default async function DesignQueuePage() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization || !workspace.user) return <WorkspaceState eyebrow="Design" title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded." primaryActionHref="/dashboard" primaryActionLabel="Go to Overview" />;
  const supabase = await createClient();
  const verticals = await getOrganizationVerticals(workspace.organization.id, supabase);
  if (!verticals.packagingEnabled) return <StateMessage title="Packaging vertical is not enabled" description="The Design Workspace is available for packaging-vertical workspaces." tone="info" />;

  const [queue, assigneeResult] = await Promise.all([getPackagingDesignWork(workspace.organization.id, supabase), getPackagingDesignAssignees()]);
  const assignees = assigneeResult.assignees;
  const roles = workspace.currentRoles ?? [];
  const designerOnly = hasWorkspaceRole(roles, ['design']) && !hasWorkspaceRole(roles, ['owner', 'admin', 'manager']);
  const canManage = hasWorkspaceRole(roles, ['owner', 'admin', 'manager']);
  const canClaim = hasWorkspaceRole(roles, ['design']);
  const currentUserId = workspace.user.id;
  const myJobs = queue.filter((item) => item.designRequest?.assigned_to === currentUserId);
  const unassigned = queue.filter((item) => !item.designRequest?.assigned_to);
  const visibleQueue = designerOnly ? myJobs : queue;

  const newRequests = visibleQueue.filter((item) => item.designStatus === 'required' && item.designRequest?.requested);
  const designing = visibleQueue.filter((item) => item.designStatus === 'required' && !item.designRequest?.requested);
  const customerReview = visibleQueue.filter((item) => item.designStatus === 'in_review');
  const changes = visibleQueue.filter((item) => item.designStatus === 'revision_required');
  const today = new Date().toISOString().slice(0, 10);
  const dueToday = visibleQueue.filter((item) => item.designRequest?.due_date === today);
  const overdue = visibleQueue.filter((item) => Boolean(item.designRequest?.due_date && item.designRequest!.due_date! < today)).length;

  const weekStart = new Date(Date.now() - 6 * 86400000).toISOString();
  const { data: approvedProofs } = await (supabase as any).from('packaging_proofs').select('id').eq('organization_id', workspace.organization.id).eq('status', 'approved').gte('reviewed_at', weekStart);
  const approvedThisWeek = (approvedProofs ?? []).length;

  const workload = assignees.map((person) => ({ person, jobs: queue.filter((item) => item.designRequest?.assigned_to === person.userId) })).sort((a, b) => b.jobs.length - a.jobs.length);

  return <div className="space-y-5 pb-16">
    <section className="rounded-3xl bg-gradient-to-r from-slate-950 via-cyan-950 to-emerald-900 p-5 text-white shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Stark Packmate · Design Operations</p><h1 className="mt-1 text-2xl font-black">{designerOnly ? 'My Design Workspace' : 'Daily Design Dashboard'}</h1><p className="mt-1 text-sm font-semibold text-white/65">{designerOnly ? 'Your assigned jobs, deadlines, customer feedback and next actions.' : 'Live ownership, workload, approvals, revision risk and production readiness.'}</p></div><div className="flex gap-2"><Link href="/quotes" className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-black">Open Quotes</Link><Link href="/dispatch-board" className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-900">Production Board</Link></div></div>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {(designerOnly ? [
        ['My jobs', myJobs.length, 'text-slate-950'], ['Due today', dueToday.length, 'text-rose-600'], ['Customer review', customerReview.length, 'text-amber-600'], ['Changes requested', changes.length, 'text-rose-600'], ['Unassigned pool', unassigned.length, 'text-cyan-700'], ['Approved this week', approvedThisWeek, 'text-emerald-600'],
      ] : [
        ['Open design jobs', queue.length, 'text-slate-950'], ['Unassigned', unassigned.length, 'text-amber-600'], ['Awaiting customer', customerReview.length, 'text-amber-600'], ['Revision required', changes.length, 'text-rose-600'], ['Designers active', workload.filter((row) => row.jobs.length > 0).length, 'text-cyan-700'], ['Overdue', overdue, 'text-rose-600'],
      ]).map(([label, value, tone]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-1 text-3xl font-black ${tone}`}>{value}</p></div>)}
    </section>

    {!designerOnly ? <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-slate-950">Team workload</h2><p className="text-xs font-semibold text-slate-500">See who owns what before assigning the next design job.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{assignees.length} designers</span></div>{assignees.length ? <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{workload.map(({ person, jobs }) => <div key={person.userId} className="rounded-2xl border border-slate-200 p-3"><div className="flex items-center justify-between"><div><p className="text-sm font-black text-slate-800">{person.name}</p><p className="text-[10px] font-semibold text-slate-400">{person.email}</p></div><span className="text-2xl font-black text-cyan-700">{jobs.length}</span></div><p className="mt-2 text-[11px] font-bold text-slate-500">{jobs.filter((job) => job.designStatus === 'revision_required').length} revisions · {jobs.filter((job) => job.designStatus === 'in_review').length} with customer</p></div>)}</div> : <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">No active Design-role users are configured yet. Add the Design role to team members before assigning jobs.</div>}</section> : null}

    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div><h2 className="text-lg font-black text-slate-950">Design pipeline</h2><p className="text-xs font-semibold text-slate-500">Sales request → Design → Customer review → Changes → Approved → Production.</p></div><div className="mt-4 flex gap-3 overflow-x-auto pb-2"><Lane title="New Brief" tone="bg-cyan-50" items={newRequests} assignees={assignees} canManage={canManage} canClaim={canClaim} currentUserId={currentUserId} /><Lane title="Designing" tone="bg-blue-50" items={designing} assignees={assignees} canManage={canManage} canClaim={canClaim} currentUserId={currentUserId} /><Lane title="Customer Review" tone="bg-amber-50" items={customerReview} assignees={assignees} canManage={canManage} canClaim={canClaim} currentUserId={currentUserId} /><Lane title="Changes Requested" tone="bg-rose-50" items={changes} assignees={assignees} canManage={canManage} canClaim={canClaim} currentUserId={currentUserId} /></div></section>

    {designerOnly && unassigned.length ? <section className="rounded-3xl border border-cyan-200 bg-cyan-50/40 p-4"><h2 className="text-lg font-black text-slate-950">Unassigned work</h2><p className="text-xs font-semibold text-slate-500">Available jobs you can claim.</p><div className="mt-3 grid gap-3 xl:grid-cols-2">{unassigned.map((item) => <JobCard key={item.lineId} item={item} assignees={assignees} canManage={false} canClaim={true} currentUserId={currentUserId} />)}</div></section> : null}

    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-slate-950">{designerOnly ? 'My jobs' : "Today's work"}</h2><p className="text-xs font-semibold text-slate-500">Prioritized by revisions, request status and due date.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{visibleQueue.length} active</span></div><div className="mt-4 space-y-3">{visibleQueue.length ? visibleQueue.map((item) => <JobCard key={item.lineId} item={item} assignees={assignees} canManage={canManage} canClaim={canClaim} currentUserId={currentUserId} />) : <div className="rounded-2xl bg-emerald-50 p-5 text-sm font-bold text-emerald-700">No active assigned design jobs.</div>}</div></section>
  </div>;
}
