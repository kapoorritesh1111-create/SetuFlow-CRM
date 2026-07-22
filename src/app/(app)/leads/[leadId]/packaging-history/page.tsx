import Link from 'next/link';
import { notFound } from 'next/navigation';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { StateMessage } from '@/components/ui/state-message';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getLeadProfileData } from '@/lib/queries/leads';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationVerticals } from '@/lib/verticals/capability';
import { getPackagingHistoryForLead, getPackagingSavedSpecs } from '@/lib/packaging/queries';

/**
 * S27-STARK-C3 — Client/brand rollup: every packaging line ever quoted for
 * this client across every quote, not just the currently active one, plus
 * their saved reorder specs. Gives an account manager full history in one
 * place instead of hunting through individual quotes.
 */

export const dynamic = 'force-dynamic';

function money(value: number, currency: string) {
  return `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusTone(status: string) {
  if (status === 'accepted') return 'bg-success-bg text-success-fg';
  if (['rejected', 'expired', 'cancelled', 'declined'].includes(status)) return 'bg-danger-bg text-danger-fg';
  return 'bg-info-bg text-info-fg';
}

export default async function PackagingClientHistoryPage({ params }: { params: { leadId: string } }) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return <WorkspaceState eyebrow="Order History" title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded." primaryActionHref="/dashboard" primaryActionLabel="Go to Overview" />;
  }

  const supabase = await createClient();
  const verticals = await getOrganizationVerticals(workspace.organization.id, supabase);
  if (!verticals.packagingEnabled) {
    return <StateMessage title="Packaging vertical is not enabled" description="Client order history is available for packaging-vertical workspaces." tone="info" />;
  }

  const data = await getLeadProfileData(workspace.organization.id, params.leadId);
  if (!data?.lead) notFound();

  const [history, savedSpecs] = await Promise.all([
    getPackagingHistoryForLead(workspace.organization.id, params.leadId, supabase),
    getPackagingSavedSpecs(workspace.organization.id, params.leadId, supabase),
  ]);

  const totalValue = history.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const totalUnits = history.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <div className="space-y-4 pb-16">
      <p className="text-sm text-content-muted">
        <Link href={`/leads/${params.leadId}`} className="hover:underline">{data.lead.company_name}</Link> / <span className="text-content-primary">Packaging Order History</span>
      </p>

      <section>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">{data.lead.company_name} — Packaging Order History</h1>
        <p className="mt-1 text-sm text-content-secondary">Every packaging line ever quoted for this client, across every quote.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-card border border-line bg-surface-1 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Packaging lines quoted</p>
          <p className="mt-1 text-2xl font-bold text-content-primary">{history.length}</p>
        </div>
        <div className="rounded-card border border-line bg-surface-1 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Total units quoted</p>
          <p className="mt-1 text-2xl font-bold text-content-primary">{totalUnits.toLocaleString()}</p>
        </div>
        <div className="rounded-card border border-line bg-surface-1 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Total quoted value</p>
          <p className="mt-1 text-2xl font-bold text-content-primary">{history[0] ? money(totalValue, history[0].currency) : '—'}</p>
        </div>
      </section>

      {savedSpecs.length ? (
        <section className="rounded-panel border border-line bg-surface-1 p-4">
          <h2 className="text-sm font-bold text-content-primary">Saved reorder specs</h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {savedSpecs.map((spec) => (
              <li key={spec.id} className="rounded-ctl border border-line bg-surface-app p-3">
                <p className="text-sm font-semibold text-content-primary">{spec.name}</p>
                <p className="text-xs text-content-muted">{spec.last_unit_price != null ? `Last: ${money(spec.last_unit_price, spec.last_currency ?? 'INR')} / pc` : 'Not yet priced'}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-panel border border-line bg-surface-1 p-4">
        <h2 className="text-sm font-bold text-content-primary">Quote history</h2>
        {history.length ? (
          <ul className="mt-2 divide-y divide-line">
            {history.map((line) => (
              <li key={line.lineId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-content-primary">{line.specSummary ?? 'Packaging line'}</p>
                  <p className="text-xs text-content-muted">
                    {line.quantity.toLocaleString()} pcs · {money(line.unitPrice, line.currency)} / pc
                    {line.leadTime ? ` · ${line.leadTime}` : ''}
                    {line.quoteUpdatedAt ? ` · ${new Date(line.quoteUpdatedAt).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(line.quoteStatus)}`}>{line.quoteStatus.replace(/_/g, ' ')}</span>
                  <Link href={`/leads/${params.leadId}/quote?quoteId=${line.quoteId}`} className="rounded-ctl border border-line bg-surface-app px-3 py-1.5 text-sm font-semibold text-content-primary hover:border-brand-200">
                    Open quote →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-ctl bg-surface-2 px-3 py-2 text-sm text-content-secondary">No packaging lines quoted for this client yet.</p>
        )}
      </section>
    </div>
  );
}
