import Link from 'next/link';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { StateMessage } from '@/components/ui/state-message';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationVerticals } from '@/lib/verticals/capability';
import { getPackagingDesignWork } from '@/lib/packaging/design-queue';
import {
  packagingDesignSourceLabel,
  packagingDesignStatusLabel,
  type PackagingDesignStatus,
} from '@/lib/packaging/design-proof';
import PackagingProofPanel from '@/features/packaging/components/packaging-proof-panel';

/**
 * Packaging design / artwork queue.
 *
 * Once a quote is accepted, every production-relevant quoted line stays here
 * until the latest design is either recorded as customer-provided or approved
 * from the Design Team. Before acceptance, the queue keeps the existing
 * artwork-needed rules.
 */

export const dynamic = 'force-dynamic';

function money(value: number, currency: string) {
  return `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function designBadgeClass(status: PackagingDesignStatus): string {
  if (status === 'ready') return 'bg-success-bg text-success-fg';
  if (status === 'revision_required') return 'bg-danger-bg text-danger-fg';
  if (status === 'in_review') return 'bg-warning-bg text-warning-fg';
  return 'bg-info-bg text-info-fg';
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

  const queue = await getPackagingDesignWork(workspace.organization.id, supabase);
  const required = queue.filter((item) => item.designStatus === 'required').length;
  const inReview = queue.filter((item) => item.designStatus === 'in_review').length;
  const revisionRequired = queue.filter((item) => item.designStatus === 'revision_required').length;
  const acceptedQuoteCount = new Set(queue.filter((item) => item.quoteStatus === 'accepted').map((item) => item.quoteId)).size;

  return (
    <div className="space-y-4 pb-16">
      <section>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">Design Queue</h1>
        <p className="mt-1 text-sm text-content-secondary">Every accepted packaging quote requires final design evidence: customer-provided artwork or a Design Team proof approved by the buyer.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-card border border-line bg-surface-1 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Accepted quotes waiting</p>
          <p className="mt-1 text-2xl font-bold text-content-primary">{acceptedQuoteCount}</p>
        </div>
        <div className="rounded-card border border-line bg-surface-1 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Design required</p>
          <p className="mt-1 text-2xl font-bold text-content-primary">{required}</p>
        </div>
        <div className="rounded-card border border-line bg-surface-1 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Awaiting approval</p>
          <p className="mt-1 text-2xl font-bold text-content-primary">{inReview}</p>
        </div>
        <div className="rounded-card border border-line bg-surface-1 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Revision required</p>
          <p className="mt-1 text-2xl font-bold text-content-primary">{revisionRequired}</p>
        </div>
      </section>

      {queue.length ? (
        <section className="rounded-panel border border-line bg-surface-1 p-4">
          <ul className="divide-y divide-line">
            {queue.map((item) => (
              <li key={item.lineId} className="flex flex-col gap-2 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-content-primary">{item.companyName ?? 'Unknown company'}</p>
                      {item.quoteNumber ? <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-content-muted">{item.quoteNumber}</span> : null}
                      {item.quoteStatus === 'accepted' ? <span className="rounded-full bg-success-bg px-2 py-0.5 text-[11px] font-semibold text-success-fg">Accepted quote</span> : null}
                      {item.sourceType === 'design_service' ? <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">Design service</span> : null}
                    </div>
                    <p className="truncate text-sm text-content-secondary">{item.specSummary ?? 'Packaging line'}</p>
                    <p className="text-xs text-content-muted">
                      {Number(item.quantity).toLocaleString()} {item.sourceType === 'packaging_line' ? 'pcs' : 'unit(s)'} · {money(item.unitPrice, item.currency)} / unit
                      {item.leadTime ? ` · ${item.leadTime}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${designBadgeClass(item.designStatus)}`}>
                      {packagingDesignStatusLabel(item.designStatus)}
                      {item.designSource ? ` · ${packagingDesignSourceLabel(item.designSource)}` : ''}
                    </span>
                    {item.leadId ? (
                      <Link href={`/leads/${item.leadId}/quote?quoteId=${item.quoteId}`} className="rounded-ctl border border-line bg-surface-app px-3 py-1.5 text-sm font-semibold text-content-primary hover:border-brand-200">
                        Open quote →
                      </Link>
                    ) : null}
                  </div>
                </div>
                {item.leadId ? <PackagingProofPanel quoteLineItemId={item.lineId} leadId={item.leadId} /> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="rounded-ctl bg-success-bg px-3 py-2 text-sm font-medium text-success-fg">All current packaging design requirements are complete.</p>
      )}
    </div>
  );
}
