import Link from 'next/link';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { StateMessage } from '@/components/ui/state-message';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationVerticals } from '@/lib/verticals/capability';
import { getPackagingDispatchQueue } from '@/lib/packaging/queries';

/**
 * S27-STARK-A3 — Dispatch/Operations role landing page.
 * v1: read-only list of packaging lines on accepted (won) quotes, ready to
 * move into production. Per-line production-stage tracking (Artwork ->
 * Prepress -> Cylinder/Plate -> Printing -> Finishing -> Dispatch) is
 * S27-STARK-E1, a separate follow-up build.
 */

export const dynamic = 'force-dynamic';

function money(value: number, currency: string) {
  return `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function DispatchBoardPage() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return <WorkspaceState eyebrow="Dispatch Board" title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded." primaryActionHref="/dashboard" primaryActionLabel="Go to Overview" />;
  }

  const supabase = await createClient();
  const verticals = await getOrganizationVerticals(workspace.organization.id, supabase);
  if (!verticals.packagingEnabled) {
    return <StateMessage title="Packaging vertical is not enabled" description="The Dispatch Board is available for packaging-vertical workspaces." tone="info" />;
  }

  const queue = await getPackagingDispatchQueue(workspace.organization.id, supabase);
  const totalUnits = queue.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return (
    <div className="space-y-4 pb-16">
      <section>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">Dispatch Board</h1>
        <p className="mt-1 text-sm text-content-secondary">Packaging jobs on accepted quotes, ready for production and dispatch.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-card border border-line bg-surface-1 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Jobs in queue</p>
          <p className="mt-1 text-2xl font-bold text-content-primary">{queue.length}</p>
        </div>
        <div className="rounded-card border border-line bg-surface-1 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Total units</p>
          <p className="mt-1 text-2xl font-bold text-content-primary">{totalUnits.toLocaleString()}</p>
        </div>
      </section>

      {queue.length ? (
        <section className="rounded-panel border border-line bg-surface-1 p-4">
          <ul className="divide-y divide-line">
            {queue.map((item) => (
              <li key={item.lineId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-content-primary">{item.companyName ?? 'Unknown company'}</p>
                  <p className="truncate text-sm text-content-secondary">{item.specSummary ?? 'Packaging line'}</p>
                  <p className="text-xs text-content-muted">{Number(item.quantity).toLocaleString()} pcs · {money(item.unitPrice, item.currency)} / pc{item.leadTime ? ` · ${item.leadTime}` : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-success-bg px-2.5 py-1 text-xs font-semibold text-success-fg">Accepted</span>
                  <Link href={`/quotes/${item.quoteId}/job-ticket`} className="rounded-ctl border border-line bg-surface-app px-3 py-1.5 text-sm font-semibold text-content-primary hover:border-brand-200">
                    Job ticket →
                  </Link>
                  {item.leadId ? (
                    <Link href={`/leads/${item.leadId}/quote?quoteId=${item.quoteId}`} className="rounded-ctl border border-line bg-surface-app px-3 py-1.5 text-sm font-semibold text-content-primary hover:border-brand-200">
                      Open quote →
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="rounded-ctl bg-surface-2 px-3 py-2 text-sm text-content-secondary">No accepted packaging jobs waiting on production right now.</p>
      )}

      <p className="rounded-ctl bg-info-bg px-3 py-2 text-sm font-medium text-info-fg">Per-stage production tracking (artwork → prepress → cylinder → printing → finishing → dispatch) is planned next for this board.</p>
    </div>
  );
}
