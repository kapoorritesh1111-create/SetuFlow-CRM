import { WorkspaceState } from '@/components/ui/workspace-state';
import { StateMessage } from '@/components/ui/state-message';
import { getWorkspaceAccess, hasWorkspaceRole } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationVerticals } from '@/lib/verticals/capability';
import { getPackagingProductionStages } from '@/lib/packaging/queries';
import { getPackagingDispatchWork } from '@/lib/packaging/dispatch-queue';
import { PRODUCTION_STAGES } from '@/lib/packaging/types';
import { PageHeader } from '@/components/ui/page-header';
import PackagingProductionBoard, { type ProductionBoardItem } from '@/features/packaging/components/packaging-production-board';

/**
 * Packaging dispatch / production control.
 *
 * Every accepted packaging quote line appears here, whether it was created by
 * the custom packaging configurator or by selecting a catalog product. Design
 * readiness is visible but never used to hide the customer or order; it gates
 * Printing and all later production stages instead.
 */

export const dynamic = 'force-dynamic';

function money(value: number, currency = 'INR') {
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

  const queue = await getPackagingDispatchWork(workspace.organization.id, supabase);
  const stageByLine = await getPackagingProductionStages(workspace.organization.id, queue.map((item) => item.lineId), supabase);
  const canEdit = hasWorkspaceRole(workspace.currentRoles, ['owner', 'admin', 'design', 'operations']);

  const items: ProductionBoardItem[] = queue.map((item) => ({
    lineId: item.lineId,
    quoteId: item.quoteId,
    quoteNumber: item.quoteNumber,
    orderId: item.orderId,
    orderNumber: item.orderNumber,
    orderLifecycleStatus: item.orderLifecycleStatus,
    leadId: item.leadId,
    companyName: item.companyName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    currency: item.currency,
    specSummary: item.specSummary,
    leadTime: item.leadTime,
    sourceType: item.sourceType,
    designStatus: item.designStatus,
    designSource: item.designSource,
    stage: stageByLine.get(item.lineId)?.stage ?? null,
    stageEnteredAt: stageByLine.get(item.lineId)?.enteredAt ?? null,
  }));

  const clientCount = new Set(queue.map((item) => item.leadId ?? item.companyName).filter(Boolean)).size;
  const quoteCount = new Set(queue.map((item) => item.quoteId)).size;
  const orderCount = new Set(queue.map((item) => item.orderId).filter(Boolean)).size;
  const designRequired = queue.filter((item) => !item.designReady).length;
  const totalUnits = queue.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const currencies = new Set(queue.map((item) => item.currency || 'INR'));
  const singleCurrency = currencies.size === 1 ? [...currencies][0] : null;
  const totalValue = queue.reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0), 0);
  const dispatchedCount = items.filter((item) => item.stage === 'dispatched').length;

  const funnelCounts = PRODUCTION_STAGES.map((stage) => ({
    ...stage,
    count: items.filter((item) => item.stage === stage.key).length,
  }));

  return (
    <div className="space-y-4 pb-16">
      <PageHeader
        eyebrow="Production"
        title="Dispatch Board"
        description="Every accepted packaging quote and customer is visible here. A final design must be customer-provided or approved from the Design Team before Printing can start."
        meta={[`${quoteCount} accepted quotes`, `${orderCount} orders`, `${clientCount} customers`, `${dispatchedCount} dispatched`, canEdit ? 'You can update stages' : 'Read-only for your role']}
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-card border border-line bg-surface-1 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Jobs in queue</p>
          <p className="mt-1 text-2xl font-bold text-content-primary">{queue.length}</p>
        </div>
        <div className="rounded-card border border-line bg-surface-1 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Customers</p>
          <p className="mt-1 text-2xl font-bold text-content-primary">{clientCount}</p>
        </div>
        <div className="rounded-card border border-line bg-surface-1 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Design required</p>
          <p className="mt-1 text-2xl font-bold text-content-primary">{designRequired}</p>
        </div>
        <div className="rounded-card border border-line bg-surface-1 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Total units</p>
          <p className="mt-1 text-2xl font-bold text-content-primary">{totalUnits.toLocaleString()}</p>
        </div>
        <div className="rounded-card border border-line bg-surface-1 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Value in queue</p>
          <p className="mt-1 text-2xl font-bold text-content-primary">{singleCurrency ? money(totalValue, singleCurrency) : 'Mixed currency'}</p>
        </div>
      </section>

      <section className="rounded-panel border border-line bg-surface-1 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Stage funnel</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {funnelCounts.map((stage) => (
            <div key={stage.key} className="rounded-ctl border border-line bg-surface-2 px-3 py-2 text-center">
              <p className="text-lg font-bold text-content-primary">{stage.count}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-content-muted">{stage.label}</p>
            </div>
          ))}
        </div>
      </section>

      {queue.length ? (
        <section className="rounded-panel border border-line bg-surface-1 p-4">
          <PackagingProductionBoard items={items} canEdit={canEdit} />
        </section>
      ) : (
        <p className="rounded-ctl bg-surface-2 px-3 py-2 text-sm text-content-secondary">No accepted packaging quotes are waiting on production right now.</p>
      )}

      {!canEdit ? (
        <p className="rounded-ctl bg-info-bg px-3 py-2 text-sm font-medium text-info-fg">Stage updates are limited to Design, Operations, and admin roles. You&apos;re seeing a live read-only view.</p>
      ) : null}
    </div>
  );
}
