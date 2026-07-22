import Link from 'next/link';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { StateMessage } from '@/components/ui/state-message';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationVerticals } from '@/lib/verticals/capability';
import { getPackagingDesignQueue } from '@/lib/packaging/queries';
import { ARTWORK_STATUS_OPTIONS } from '@/lib/packaging/types';

/**
 * S27-STARK-A3 — Design/Prepress role landing page.
 * Shows every packaging quote line on an active quote that still needs
 * artwork attention (needs pre-press or artwork not provided yet), across
 * the whole org — not scoped to "my leads", since design supports every
 * account manager's jobs.
 */

export const dynamic = 'force-dynamic';

function artworkLabel(status: string | null) {
  if (!status) return 'Not specified';
  return ARTWORK_STATUS_OPTIONS.find((option) => option.key === status)?.label ?? status;
}

function money(value: number, currency: string) {
  return `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function DesignQueuePage() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return <WorkspaceState eyebrow="Design Queue" title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded." primaryActionHref="/dashboard" primaryActionLabel="Go to Overview" />;
  }

  const supabase = await createClient();
  const verticals = await getOrganizationVerticals(workspace.organization.id, supabase);
  if (!verticals.packagingEnabled) {
    return <StateMessage title="Packaging vertical is not enabled" description="The Design Queue is available for packaging-vertical workspaces." tone="info" />;
  }

  const queue = await getPackagingDesignQueue(workspace.organization.id, supabase);
  const needsPrepress = queue.filter((item) => item.artworkStatus === 'needs_prepress');
  const notProvided = queue.filter((item) => item.artworkStatus !== 'needs_prepress');

  return (
    <div className="space-y-4 pb-16">
      <section>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">Design Queue</h1>
        <p className="mt-1 text-sm text-content-secondary">Every packaging job across active quotes that still needs artwork attention. Sorted so pre-press-flagged jobs come first.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-card border border-line bg-surface-1 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Needs pre-press</p>
          <p className="mt-1 text-2xl font-bold text-content-primary">{needsPrepress.length}</p>
        </div>
        <div className="rounded-card border border-line bg-surface-1 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Awaiting artwork</p>
          <p className="mt-1 text-2xl font-bold text-content-primary">{notProvided.length}</p>
        </div>
      </section>

      {queue.length ? (
        <section className="rounded-panel border border-line bg-surface-1 p-4">
          <ul className="divide-y divide-line">
            {[...needsPrepress, ...notProvided].map((item) => (
              <li key={item.lineId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-content-primary">{item.companyName ?? 'Unknown company'}</p>
                  <p className="truncate text-sm text-content-secondary">{item.specSummary ?? 'Packaging line'}</p>
                  <p className="text-xs text-content-muted">{Number(item.quantity).toLocaleString()} pcs · {money(item.unitPrice, item.currency)} / pc{item.leadTime ? ` · ${item.leadTime}` : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.artworkStatus === 'needs_prepress' ? 'bg-warning-bg text-warning-fg' : 'bg-info-bg text-info-fg'}`}>
                    {artworkLabel(item.artworkStatus)}
                  </span>
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
        <p className="rounded-ctl bg-success-bg px-3 py-2 text-sm font-medium text-success-fg">Nothing waiting on artwork right now — queue is clear.</p>
      )}
    </div>
  );
}
