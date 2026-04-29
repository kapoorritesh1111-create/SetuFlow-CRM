import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function formatMoney(amount: number, currency: string | null) {
  return `${currency ?? 'USD'} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

async function confirmAndSendQuote(formData: FormData) {
  'use server';

  const quoteId = String(formData.get('quote_id') ?? '').trim();
  if (!quoteId) redirect('/quotes?status=pending_approval');

  const workspace = await requireWorkspace();
  if (!workspace.organization) redirect('/quotes?status=pending_approval');

  const supabase = await createClient();
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('id, lead_id, organization_id, status, currency, display_currency, pricing_basis')
    .eq('organization_id', workspace.organization.id)
    .eq('id', quoteId)
    .maybeSingle();

  if (quoteError || !quote) redirect('/quotes?status=pending_approval');

  const sentAt = new Date().toISOString();
  await supabase
    .from('quotes')
    .update({ status: 'sent', updated_at: sentAt })
    .eq('organization_id', workspace.organization.id)
    .eq('id', quoteId);

  await supabase
    .from('quote_versions')
    .update({ status: 'sent', sent_at: sentAt })
    .eq('quote_id', quoteId)
    .eq('status', 'approved');

  await supabase.rpc('app_ensure_contract_for_accepted_quote_tx', {
    p_organization_id: workspace.organization.id,
    p_quote_id: quote.id,
    p_lead_id: quote.lead_id,
    p_notes: 'Created from sent quote in approval-send flow.',
  });

  revalidatePath('/quotes');
  revalidatePath('/orders');
  redirect(`/orders?notice=quote-sent&eId=${quoteId}`);
}

type ApprovalSendPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function ApprovalSendPage({ searchParams }: ApprovalSendPageProps) {
  const workspace = await requireWorkspace();
  const quoteId = readParam(searchParams?.quoteId).trim();

  if (!workspace.membership || !workspace.organization) {
    return (
      <WorkspaceState
        eyebrow="Approval → Send"
        title="Workspace membership needed"
        description="Your account is signed in, but no active organization membership could be loaded. Confirm the organization membership is active before sending quotes."
        primaryActionHref="/dashboard"
        primaryActionLabel="Go to Overview"
      />
    );
  }

  if (!quoteId) {
    return (
      <WorkspaceState
        eyebrow="Approval → Send"
        title="Select a quote to send"
        description="Choose an approved quote from the quotes workspace before sending it to the buyer."
        primaryActionHref="/quotes?status=pending_approval"
        primaryActionLabel="Back to pending approvals"
      />
    );
  }

  const supabase = await createClient();
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('id, lead_id, organization_id, quote_number, status, currency, display_currency, current_version_id, accepted_version_id, pricing_basis')
    .eq('organization_id', workspace.organization.id)
    .eq('id', quoteId)
    .maybeSingle();

  if (quoteError || !quote) {
    return (
      <WorkspaceState
        eyebrow="Approval → Send"
        title="Quote not found"
        description="This quote could not be loaded in the active workspace. Return to quotes and select another approved quote."
        primaryActionHref="/quotes?status=pending_approval"
        primaryActionLabel="Back to quotes"
      />
    );
  }

  if (String(quote.status ?? '').toLowerCase() === 'sent') {
    return (
      <WorkspaceState
        eyebrow="Approval → Send"
        title="Quote already sent"
        description="This quote has already moved into the order execution loop. Open Orders to continue fulfilment."
        primaryActionHref="/orders"
        primaryActionLabel="Open orders"
      />
    );
  }

  const [{ data: lead }, { data: versions }] = await Promise.all([
    supabase
      .from('leads')
      .select('id, company_name, contact_name')
      .eq('organization_id', workspace.organization.id)
      .eq('id', quote.lead_id)
      .maybeSingle(),
    supabase
      .from('quote_versions')
      .select('id, version_no, status, total_line_count, display_currency, valid_until')
      .eq('quote_id', quote.id)
      .order('version_no', { ascending: false })
      .limit(5),
  ]);

  const version = (versions ?? []).find((entry) => entry.id === quote.accepted_version_id || entry.id === quote.current_version_id) ?? versions?.[0] ?? null;
  const { data: lines } = version?.id
    ? await supabase
      .from('quote_version_line_items')
      .select('id, final_case_price, final_kg_price, final_unit_price, display_currency, is_overridden')
      .eq('quote_version_id', version.id)
      .order('sort_order', { ascending: true })
    : { data: [] };

  const lineItems = lines ?? [];
  const subtotal = lineItems.reduce((sum, line) => sum + Number(line.final_case_price ?? line.final_kg_price ?? line.final_unit_price ?? 0), 0);
  const currency = version?.display_currency ?? quote.display_currency ?? quote.currency ?? 'USD';
  const hasOverride = lineItems.some((line) => Boolean(line.is_overridden));
  const validUntil = formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Approval → Send</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Confirm quote send</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Review the approved quote summary, then send it into the execution workspace. Sending also ensures the matching order contract exists.
            </p>
          </div>
          <span className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Ready to send
          </span>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Quote summary</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">{quote.quote_number ?? `Quote ${quote.id.slice(0, 8)}`}</h2>
              <p className="mt-1 text-sm text-slate-500">Version {version?.version_no ?? '—'} · {String(quote.status ?? 'approved').replaceAll('_', ' ')}</p>
            </div>
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Buyer company</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{lead?.company_name ?? 'Buyer pending'}</dd>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Contact</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{lead?.contact_name ?? 'Contact pending'}</dd>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Lines</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{version?.total_line_count ?? lineItems.length}</dd>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Subtotal</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{formatMoney(subtotal, currency)}</dd>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Validity</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">7 days · valid until {validUntil}</dd>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Price overrides</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{hasOverride ? 'Override note present' : 'No overrides flagged'}</dd>
            </div>
          </dl>
        </div>

        <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Send actions</p>
          <p className="mt-2 text-sm text-slate-500">Confirming send updates the quote status and ingests the order into the execution desk without creating duplicates.</p>
          <form action={confirmAndSendQuote} className="mt-6 space-y-3">
            <input type="hidden" name="quote_id" value={quote.id} />
            <button type="submit" className="flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
              Confirm &amp; Send
            </button>
            <Link href="/quotes" className="flex w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Back to quotes
            </Link>
          </form>
        </aside>
      </section>
    </main>
  );
}
