import Link from 'next/link';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { StateMessage } from '@/components/ui/state-message';
import { getWorkspaceAccess, hasWorkspaceRole } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationVerticals } from '@/lib/verticals/capability';
import { getPackagingDesignWork, type PackagingDesignQueueItem } from '@/lib/packaging/design-queue';
import { packagingDesignSourceLabel, packagingDesignStatusLabel } from '@/lib/packaging/design-proof';
import PackagingProofPanel from '@/features/packaging/components/packaging-proof-panel';

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
  const today = new Date();
  const dueDate = new Date(`${due}T23:59:59`);
  const diff = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: `Overdue ${Math.abs(diff)}d`, tone: 'bg-rose-100 text-rose-700' };
  if (diff === 0) return { label: 'Due today', tone: 'bg-rose-100 text-rose-700' };
  if (diff === 1) return { label: 'Due tomorrow', tone: 'bg-amber-100 text-amber-700' };
  return { label: `Due ${due}`, tone: 'bg-slate-100 text-slate-600' };
}

function JobCard({ item, compact = false }: { item: PackagingDesignQueueItem; compact?: boolean }) {
  const due = dueLabel(item);
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
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
        {item.designRequest?.requested ? <span className="rounded-full bg-cyan-50 px-2 py-1 text-cyan-700">Sales request</span> : null}
        {item.designSource ? <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{packagingDesignSourceLabel(item.designSource)}</span> : null}
        {due ? <span className={`rounded-full px-2 py-1 ${due.tone}`}>{due.label}</span> : null}
        {item.artworkStatus ? <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">Artwork: {item.artworkStatus.replaceAll('_', ' ')}</span> : null}
      </div>
      {!compact ? <>
        {item.designRequest?.notes ? <p className="mt-2 rounded-xl bg-slate-50 p-2 text-[11px] font-semibold text-slate-600">{item.designRequest.notes}</p> : null}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="text-[11px] font-semibold text-slate-500">{Number(item.quantity || 0).toLocaleString()} {item.sourceType === 'packaging_line' ? 'pcs' : 'unit(s)'}</div>
          {item.leadId ? <Link href={`/leads/${item.leadId}/quote?quoteId=${item.quoteId}`} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:border-cyan-300">Open quote →</Link> : null}
        </div>
        {item.leadId ? <PackagingProofPanel quoteLineItemId={item.lineId} leadId={item.leadId} /> : null}
      </> : null}
    </article>
  );
}

function Lane({ title, count, tone, items }: { title: string; count: number; tone: string; items: PackagingDesignQueueItem[] }) {
  return (
    <section className={`min-w-[250px] flex-1 rounded-2xl border border-slate-200 ${tone} p-3`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-black uppercase tracking-wide text-slate-700">{title}</h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-slate-700 shadow-sm">{count}</span>
      </div>
      <div className="mt-3 space-y-2">{items.length ? items.slice(0, 8).map((item) => <JobCard key={item.lineId} item={item} compact />) : <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-4 text-center text-xs font-semibold text-slate-400">No jobs</div>}</div>
    </section>
  );
}

export default async function DesignQueuePage() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) return <WorkspaceState eyebrow="Design" title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded." primaryActionHref="/dashboard" primaryActionLabel="Go to Overview" />;

  const supabase = await createClient();
  const verticals = await getOrganizationVerticals(workspace.organization.id, supabase);
  if (!verticals.packagingEnabled) return <StateMessage title="Packaging vertical is not enabled" description="The Design Workspace is available for packaging-vertical workspaces." tone="info" />;

  const queue = await getPackagingDesignWork(workspace.organization.id, supabase);
  const currentRoles = workspace.currentRoles ?? [];
  const designerOnly = hasWorkspaceRole(currentRoles, ['design']) && !hasWorkspaceRole(currentRoles, ['owner', 'admin']);
  const isOwnerView = !designerOnly;

  const newRequests = queue.filter((item) => item.designStatus === 'required' && item.designRequest?.requested);
  const designing = queue.filter((item) => item.designStatus === 'required' && !item.designRequest?.requested);
  const customerReview = queue.filter((item) => item.designStatus === 'in_review');
  const changes = queue.filter((item) => item.designStatus === 'revision_required');
  const dueToday = queue.filter((item) => item.designRequest?.due_date === new Date().toISOString().slice(0, 10));
  const awaitingCustomer = customerReview.length;

  const weekStart = new Date(Date.now() - (6 * 86400000)).toISOString();
  const { data: approvedProofs } = await (supabase as any)
    .from('packaging_proofs')
    .select('id, quote_line_item_id, version, reviewed_at, file_name')
    .eq('organization_id', workspace.organization.id)
    .eq('status', 'approved')
    .gte('reviewed_at', weekStart)
    .order('reviewed_at', { ascending: false });
  const approvedThisWeek = (approvedProofs ?? []).length;

  const { data: recentProofs } = await (supabase as any)
    .from('packaging_proofs')
    .select('id, quote_line_item_id, version, status, reviewed_at, uploaded_at, review_comment, file_name')
    .eq('organization_id', workspace.organization.id)
    .order('uploaded_at', { ascending: false })
    .limit(8);

  const openJobs = queue.length;
  const overdue = queue.filter((item) => {
    const due = item.designRequest?.due_date;
    return Boolean(due && due < new Date().toISOString().slice(0, 10));
  }).length;

  return (
    <div className="space-y-5 pb-16">
      <section className="rounded-3xl bg-gradient-to-r from-slate-950 via-cyan-950 to-emerald-900 p-5 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Stark Packmate · Design Operations</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">{isOwnerView ? 'Daily Design Dashboard' : 'My Design Workspace'}</h1>
            <p className="mt-1 max-w-3xl text-sm font-semibold text-white/65">{isOwnerView ? 'One view of design demand, customer approvals, revision risk and production readiness.' : 'Your daily work queue: new briefs, active designs, customer feedback and next actions.'}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/quotes" className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-black text-white hover:bg-white/15">Open Quotes</Link>
            <Link href="/dispatch-board" className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-900">Production Board</Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {(isOwnerView ? [
          ['Open design jobs', openJobs, 'text-slate-950'],
          ['Awaiting customer', awaitingCustomer, 'text-amber-600'],
          ['Revision required', changes.length, 'text-rose-600'],
          ['New sales requests', newRequests.length, 'text-cyan-700'],
          ['Approved this week', approvedThisWeek, 'text-emerald-600'],
          ['Overdue', overdue, 'text-rose-600'],
        ] : [
          ['Jobs in queue', openJobs, 'text-slate-950'],
          ['Due today', dueToday.length, 'text-rose-600'],
          ['Customer review', awaitingCustomer, 'text-amber-600'],
          ['Changes requested', changes.length, 'text-rose-600'],
          ['New briefs', newRequests.length, 'text-cyan-700'],
          ['Approved this week', approvedThisWeek, 'text-emerald-600'],
        ]).map(([label, value, tone]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-1 text-3xl font-black ${tone}`}>{value}</p></div>)}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-black text-slate-950">Design pipeline</h2><p className="text-xs font-semibold text-slate-500">Sales request → Design → Customer review → Changes → Approved → Production.</p></div>
          <div className="text-xs font-bold text-slate-400">Live from quote lines and proof status</div>
        </div>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          <Lane title="New Brief" count={newRequests.length} tone="bg-cyan-50" items={newRequests} />
          <Lane title="Designing" count={designing.length} tone="bg-blue-50" items={designing} />
          <Lane title="Customer Review" count={customerReview.length} tone="bg-amber-50" items={customerReview} />
          <Lane title="Changes Requested" count={changes.length} tone="bg-rose-50" items={changes} />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-slate-950">Today's work</h2><p className="text-xs font-semibold text-slate-500">Prioritized by changes requested, sales request, due date and latest activity.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{queue.length} active</span></div>
          <div className="mt-4 space-y-3">{queue.length ? queue.map((item) => <JobCard key={item.lineId} item={item} />) : <div className="rounded-2xl bg-emerald-50 p-5 text-sm font-bold text-emerald-700">All current packaging design requirements are complete.</div>}</div>
        </section>

        <div className="space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-black text-slate-950">Daily attention</h2>
            <div className="mt-3 space-y-2">
              {changes.length ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3"><div className="text-xs font-black text-rose-700">Customer changes waiting</div><div className="mt-1 text-2xl font-black text-rose-700">{changes.length}</div></div> : null}
              {dueToday.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3"><div className="text-xs font-black text-amber-700">Due today</div><div className="mt-1 text-2xl font-black text-amber-700">{dueToday.length}</div></div> : null}
              {!changes.length && !dueToday.length ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">No urgent design blockers right now.</div> : null}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-black text-slate-950">Recent design activity</h2>
            <div className="mt-3 space-y-2">{(recentProofs ?? []).length ? (recentProofs ?? []).map((proof: any) => <div key={proof.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-black text-slate-700">v{proof.version} · {proof.file_name}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${proof.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : proof.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{proof.status}</span></div>{proof.review_comment ? <p className="mt-1 text-[11px] font-semibold text-slate-500">“{proof.review_comment}”</p> : null}<p className="mt-1 text-[10px] font-bold text-slate-400">{new Date(proof.reviewed_at ?? proof.uploaded_at).toLocaleString()}</p></div>) : <p className="text-xs font-semibold text-slate-400">No proof activity recorded yet.</p>}</div>
          </section>
        </div>
      </div>
    </div>
  );
}
