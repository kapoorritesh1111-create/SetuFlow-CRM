import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';

type SearchParams = Record<string, string | string[] | undefined>;

type PendingApprovalRow = {
  id: string;
  quote_id: string;
  quote_version_id: string;
  rule: string | null;
  reason: string | null;
  status: string;
  created_at: string;
  quotes?: {
    id: string;
    quote_number: string | null;
    lead_id: string | null;
    status: string | null;
    current_version_id: string | null;
    leads?: { id: string; company_name: string | null; contact_name: string | null } | null;
  } | null;
  quote_versions?: { id: string; version_no: number | null; status: string | null; total_line_count: number | null; display_currency: string | null } | null;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function title(value?: string | null) {
  return String(value || 'pending').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function fmtDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

async function syncQuoteVersionAfterDecision(input: {
  supabase: any;
  organizationId: string;
  quoteId: string;
  quoteVersionId: string;
  actorUserId: string;
  decision: string;
}) {
  const now = new Date().toISOString();
  const approved = input.decision === 'approved';
  const nextStatus = approved ? 'approved' : 'draft';
  const { error: versionError } = await input.supabase
    .from('quote_versions')
    .update({
      status: nextStatus,
      approved_at: approved ? now : null,
      approved_by: approved ? input.actorUserId : null,
      updated_at: now,
    })
    .eq('quote_id', input.quoteId)
    .eq('id', input.quoteVersionId);

  if (versionError) throw versionError;

  await input.supabase
    .from('quotes')
    .update({ approval_required: false, updated_at: now })
    .eq('organization_id', input.organizationId)
    .eq('id', input.quoteId);
}

async function decideApproval(formData: FormData): Promise<void> {
  'use server';

  const requestId = String(formData.get('approval_request_id') ?? '').trim();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  const quoteVersionId = String(formData.get('quote_version_id') ?? '').trim();
  const decision = String(formData.get('decision') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim() || null;

  const workspace = await requireWorkspace();
  if (!workspace.organization || !workspace.user) redirect('/approval-queue?error=auth');
  if (!requestId || !quoteId || !quoteVersionId || !['approved', 'rejected'].includes(decision)) redirect('/approval-queue?error=missing-input');

  const supabase = (await createClient()) as any;
  const { error } = await supabase.rpc('app_decide_quote_approval_tx', {
    p_organization_id: workspace.organization.id,
    p_quote_id: quoteId,
    p_quote_version_id: quoteVersionId,
    p_actor_user_id: workspace.user.id,
    p_decision: decision,
    p_reason: reason,
  });

  if (error) redirect(`/approval-queue?quoteId=${quoteId}&error=${encodeURIComponent(error.message ?? 'approval-decision-failed')}`);

  try {
    await syncQuoteVersionAfterDecision({
      supabase,
      organizationId: workspace.organization.id,
      quoteId,
      quoteVersionId,
      actorUserId: workspace.user.id,
      decision,
    });
  } catch (syncError) {
    const message = syncError instanceof Error ? syncError.message : 'approval-sync-failed';
    redirect(`/approval-queue?quoteId=${quoteId}&error=${encodeURIComponent(message)}`);
  }

  const { data: quote } = await supabase
    .from('quotes')
    .select('lead_id')
    .eq('organization_id', workspace.organization.id)
    .eq('id', quoteId)
    .maybeSingle();

  revalidatePath('/approval-queue');
  revalidatePath('/quotes');
  revalidatePath(`/leads`);
  if (quote?.lead_id) {
    revalidatePath(`/leads/${quote.lead_id}`);
    revalidatePath(`/leads/${quote.lead_id}/quote`);
  }

  if (quote?.lead_id) redirect(`/leads/${quote.lead_id}/quote?quoteId=${quoteId}&step=5&saved=approval-${decision}`);
  redirect(`/approval-queue?quoteId=${quoteId}&saved=${decision}`);
}

export default async function ApprovalQueuePage({ searchParams }: { searchParams?: SearchParams }) {
  const workspace = await requireWorkspace();
  const quoteId = readParam(searchParams?.quoteId).trim();
  const saved = readParam(searchParams?.saved).trim();
  const error = readParam(searchParams?.error).trim();

  if (!workspace.membership || !workspace.organization) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <section className="rounded-hero border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Approval Queue</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Workspace membership needed</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">Your account must have an active organization membership to review approvals.</p>
        </section>
      </main>
    );
  }

  const supabase = (await createClient()) as any;
  let query = supabase
    .from('approval_requests')
    .select('id, quote_id, quote_version_id, rule, reason, status, created_at, quotes(id, quote_number, lead_id, status, current_version_id, leads(id, company_name, contact_name)), quote_versions(id, version_no, status, total_line_count, display_currency)')
    .eq('organization_id', workspace.organization.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (quoteId) query = query.eq('quote_id', quoteId);

  const { data, error: loadError } = await query;
  const approvals = (data ?? []) as PendingApprovalRow[];

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Trade Command Center</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Approval Queue</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">Approve or reject quote requests before they can move to send.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/quotes?status=pending_approval" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm">Quotes Worklist</Link>
            <Link href="/leads" className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm">Back to Leads</Link>
          </div>
        </header>

        {saved ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-black text-emerald-800">Approval request {saved}.</div> : null}
        {error || loadError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-black text-rose-800">Approval queue needs attention: {decodeURIComponent(error || loadError?.message || 'load-failed')}</div> : null}

        <section className="rounded-hero border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-600">Pending approvals</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">{approvals.length} request{approvals.length === 1 ? '' : 's'} waiting</h2>
            </div>
            {quoteId ? <Link href="/approval-queue" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600">Show all approvals</Link> : null}
          </div>

          <div className="mt-5 grid gap-4">
            {approvals.length ? approvals.map((approval) => {
              const quote = approval.quotes;
              const version = approval.quote_versions;
              const lead = quote?.leads;
              return (
                <article key={approval.id} className="rounded-card border border-amber-200 bg-amber-50/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">{approval.rule || 'quote approval'}</p>
                      <h3 className="mt-1 text-xl font-black text-slate-950">{quote?.quote_number || `Quote ${approval.quote_id.slice(0, 8)}`}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-600">{lead?.company_name || 'Buyer'} · Version v{version?.version_no ?? '—'} · {title(version?.status)} · Requested {fmtDate(approval.created_at)}</p>
                      <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700">{approval.reason || 'Approval requested before sending.'}</p>
                    </div>
                    <div className="grid min-w-[280px] gap-2">
                      <Link href={`/leads/${quote?.lead_id || ''}/quote?quoteId=${approval.quote_id}&step=5`} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-black text-slate-700">Back to Send Gate</Link>
                      <Link href={`/leads/${quote?.lead_id || ''}/quote?quoteId=${approval.quote_id}&step=2`} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-black text-slate-700">Review Pricing</Link>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <form action={decideApproval} className="rounded-2xl border border-emerald-200 bg-white p-4">
                      <input type="hidden" name="approval_request_id" value={approval.id} />
                      <input type="hidden" name="quote_id" value={approval.quote_id} />
                      <input type="hidden" name="quote_version_id" value={approval.quote_version_id} />
                      <input type="hidden" name="decision" value="approved" />
                      <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">Approval note<textarea name="reason" placeholder="Approved because pricing is acceptable..." className="min-h-20 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-700" /></label>
                      <button className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white">Approve Quote</button>
                    </form>
                    <form action={decideApproval} className="rounded-2xl border border-rose-200 bg-white p-4">
                      <input type="hidden" name="approval_request_id" value={approval.id} />
                      <input type="hidden" name="quote_id" value={approval.quote_id} />
                      <input type="hidden" name="quote_version_id" value={approval.quote_version_id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">Rejection reason<textarea name="reason" placeholder="Explain what needs to change..." className="min-h-20 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-700" /></label>
                      <button className="mt-3 w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-black text-white">Reject / Return to Draft</button>
                    </form>
                  </div>
                </article>
              );
            }) : (
              <div className="rounded-card border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <p className="text-lg font-black text-slate-950">No pending approvals found</p>
                <p className="mt-2 text-sm font-semibold text-slate-500">If a quote says approval is pending, return to the quote and confirm the version/request state.</p>
                <Link href="/quotes" className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Open Quotes</Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
