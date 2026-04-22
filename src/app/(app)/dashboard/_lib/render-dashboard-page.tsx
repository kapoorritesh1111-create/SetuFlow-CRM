import { EmptyState } from '@/components/ui/empty-state';
import Link from 'next/link';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { withMode, buildOrdersHref } from '@/lib/workflow/handoffs';
import { createClient } from '@/lib/supabase/server';
import DashboardInteractive from '@/features/dashboard/components/dashboard-interactive';
import type { DashboardScope } from '@/features/dashboard/types';
import type { WorkspaceMode } from '@/features/workspace/types';
import { getDashboardData } from '@/lib/queries/dashboard';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';

const BUYER_DEFAULT_ROLE_NAMES = ['sales'] as const;
const SUPPLIER_DEFAULT_ROLE_NAMES = ['sourcing', 'procurement'] as const;

function resolveRoleAwareDashboardScope(
  requestedScope: DashboardScope,
  currentRoles: string[],
): DashboardScope {
  if (requestedScope !== 'all') return requestedScope;

  const normalizedRoles = new Set(currentRoles.map((role) => role.trim().toLowerCase()).filter(Boolean));
  const hasBuyerDefaultRole = BUYER_DEFAULT_ROLE_NAMES.some((role) => normalizedRoles.has(role));
  const hasSupplierDefaultRole = SUPPLIER_DEFAULT_ROLE_NAMES.some((role) => normalizedRoles.has(role));

  if (hasBuyerDefaultRole && !hasSupplierDefaultRole) return 'buyer';
  if (hasSupplierDefaultRole && !hasBuyerDefaultRole) return 'supplier';
  return 'all';
}



type DashboardActionSummary = {
  pendingActionCount: number;
  overdueFollowUpCount: number;
  draftQuoteCount: number;
  recentInbound: Array<{
    id: string;
    company_name: string | null;
    contact_name: string | null;
    source_label: string | null;
    created_at: string | null;
  }>;
};

async function getDashboardActionSummary(organizationId: string): Promise<DashboardActionSummary> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const [{ count: overdueFollowUpCount }, { count: draftQuoteCount }, { data: recentInbound }] = await Promise.all([
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .lte('next_follow_up_at', nowIso),
    supabase
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .in('status', ['draft', 'sent', 'pending', 'approved']),
    supabase
      .from('leads')
      .select('id, company_name, contact_name, source_label, created_at')
      .eq('organization_id', organizationId)
      .eq('source_type', 'public_card')
      .order('created_at', { ascending: false })
      .limit(4),
  ]);

  const normalizedInbound = (recentInbound ?? []) as DashboardActionSummary['recentInbound'];
  return {
    overdueFollowUpCount: overdueFollowUpCount ?? 0,
    draftQuoteCount: draftQuoteCount ?? 0,
    pendingActionCount: (overdueFollowUpCount ?? 0) + (draftQuoteCount ?? 0),
    recentInbound: normalizedInbound,
  };
}


function workspaceModeToDashboardScope(mode: WorkspaceMode): DashboardScope {
  if (mode === 'buyers') return 'buyer';
  if (mode === 'suppliers') return 'supplier';
  return 'all';
}

export async function renderDashboardPage(mode: WorkspaceMode) {
  const scope = workspaceModeToDashboardScope(mode);
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return (
      <EmptyState
        title="Workspace membership needed"
        description="Your account is signed in, but no active organization membership could be loaded. Confirm the organization_members row is active for this user."
      />
    );
  }

  const resolvedScope = resolveRoleAwareDashboardScope(scope, workspace.currentRoles);
  const canManageLeads = hasWorkspaceCapability(workspace.currentRoles, 'lead.manage');
  const readOnlyMessage = canManageLeads
    ? null
    : getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ?? 'Dashboard drill-through is available, but commercial record updates stay read-only for this role.';
  const [data, actionSummary] = await Promise.all([
    getDashboardData(workspace.organization.id, resolvedScope),
    getDashboardActionSummary(workspace.organization.id),
  ]);
  if (!data) {
    const emptyStateTitle =
      resolvedScope === 'buyer'
        ? 'Buyer dashboard will appear here'
        : resolvedScope === 'supplier'
          ? 'Supplier dashboard will appear here'
          : 'Dashboard will appear here';

    const emptyStateDescription =
      resolvedScope === 'buyer'
        ? 'Connect Supabase and the buyer dashboard will render from your live CRM tables.'
        : resolvedScope === 'supplier'
          ? 'Connect Supabase and the supplier dashboard will render from your live CRM tables.'
          : 'Connect Supabase and the workspace dashboard will render from your live CRM tables.';

    return <EmptyState title={emptyStateTitle} description={emptyStateDescription} />;
  }

  const primaryHref = actionSummary.overdueFollowUpCount > 0
    ? withMode(`${PRODUCT_ROUTES.app.leads}?handoff=dashboard-overdue`, resolvedScope === 'buyer' ? 'buyers' : resolvedScope === 'supplier' ? 'suppliers' : null)
    : actionSummary.draftQuoteCount > 0
      ? withMode(`${PRODUCT_ROUTES.app.pipeline}?handoff=dashboard-rescue`, resolvedScope === 'buyer' ? 'buyers' : resolvedScope === 'supplier' ? 'suppliers' : null)
      : buildOrdersHref({ handoff: 'dashboard-execution' }, resolvedScope === 'buyer' ? 'buyers' : resolvedScope === 'supplier' ? 'suppliers' : null);
  const primaryLabel = actionSummary.overdueFollowUpCount > 0
    ? 'Clear overdue follow-ups'
    : actionSummary.draftQuoteCount > 0
      ? 'Open the rescue board'
      : 'Open execution workspace';
  const primaryReason = actionSummary.overdueFollowUpCount > 0
    ? `${actionSummary.overdueFollowUpCount} overdue follow-up item${actionSummary.overdueFollowUpCount === 1 ? '' : 's'} need attention now.`
    : actionSummary.draftQuoteCount > 0
      ? `${actionSummary.draftQuoteCount} quote${actionSummary.draftQuoteCount === 1 ? '' : 's'} still need a decision.`
      : 'No overdue follow-up pile is visible, so execution is the next route to check.';
  const mixedScopeLabel = resolvedScope === 'buyer' ? 'Buyer view' : resolvedScope === 'supplier' ? 'Supplier view' : 'Mixed view';

  return (
    <div className="space-y-6">
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-soft">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.35rem] border border-slate-200 bg-slate-950 px-5 py-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Dashboard / Overview</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Act on the next stuck item</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{mixedScopeLabel} is active. Start with the one route that clears pressure fastest, then scan the rest only if you need broader context.</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link href={primaryHref} className="inline-flex rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-slate-100">
                {primaryLabel}
              </Link>
              <span className="text-sm text-slate-300">{primaryReason}</span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50/80 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">Do now</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{actionSummary.pendingActionCount}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">Items are already late or waiting on a decision.</p>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Follow-up pressure</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{actionSummary.overdueFollowUpCount}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">Overdue follow-ups are the fastest route to clear next.</p>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Quote decisions</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{actionSummary.draftQuoteCount}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">Quotes still waiting for send, approval, or rescue.</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <Link href={withMode(`${PRODUCT_ROUTES.app.pipeline}?handoff=dashboard-open-pipeline`, resolvedScope === 'buyer' ? 'buyers' : resolvedScope === 'supplier' ? 'suppliers' : null)} className="font-semibold text-slate-700 hover:text-slate-900">Open Pipeline</Link>
          <Link href={withMode(`${PRODUCT_ROUTES.app.leads}?handoff=dashboard-open-follow-up`, resolvedScope === 'buyer' ? 'buyers' : resolvedScope === 'supplier' ? 'suppliers' : null)} className="font-semibold text-slate-700 hover:text-slate-900">Open Follow-up</Link>
          <Link href={buildOrdersHref({ handoff: 'dashboard-open-orders' }, resolvedScope === 'buyer' ? 'buyers' : resolvedScope === 'supplier' ? 'suppliers' : null)} className="font-semibold text-slate-700 hover:text-slate-900">Open Orders</Link>
        </div>
      </section>

      <DashboardInteractive
        data={data}
        initialLeadType={resolvedScope === 'all' ? '' : resolvedScope}
        currentRoles={workspace.currentRoles}
        dashboardVariant={resolvedScope}
        workspaceMode={mode}
        persistenceKey={`dashboard:${workspace.organization.id}:${workspace.membership.id}:${resolvedScope}`}
        serverNowIso={new Date().toISOString()}
        readOnlyMessage={readOnlyMessage}
      />
    </div>
  );
}
