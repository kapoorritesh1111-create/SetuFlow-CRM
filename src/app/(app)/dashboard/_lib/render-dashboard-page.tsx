import { EmptyState } from '@/components/ui/empty-state';
import { StateMessage } from '@/components/ui/state-message';
import Link from 'next/link';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { withMode, buildOrdersHref } from '@/lib/workflow/handoffs';
import { createClient } from '@/lib/supabase/server';
import DashboardInteractive from '@/features/dashboard/components/dashboard-interactive';
import { AICompactActionBrief } from '@/features/ai/ui/intelligence-panels';
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

function formatRelativeTimestamp(value: string | null) {
  if (!value) return 'recent';
  const diffMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diffMs)) return 'recent';
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
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

  return (
    <div className="space-y-6">
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Dashboard / Overview</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">See what needs intervention, then open the next working route</h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">{resolvedScope === 'buyer'
              ? 'Buyer mode is active. Use the dashboard to spot the next overdue or blocked buyer record, then move into Follow-up to clear it.'
              : resolvedScope === 'supplier'
                ? 'Supplier mode is active. Use the dashboard to spot the next blocked supplier record, then move into Pipeline or Orders to clear it.'
                : 'This mixed view keeps buyer and supplier pressure visible in one place. Start with the next overdue or blocked record, then move into the route that resolves it.'}</p>
          </div>
          <div className="flex flex-col items-start gap-2 lg:min-w-[240px]">
            <Link href={actionSummary.overdueFollowUpCount > 0 ? withMode(`${PRODUCT_ROUTES.app.leads}?handoff=dashboard-overdue`, resolvedScope === 'buyer' ? 'buyers' : resolvedScope === 'supplier' ? 'suppliers' : null) : actionSummary.draftQuoteCount > 0 ? withMode(`${PRODUCT_ROUTES.app.pipeline}?handoff=dashboard-rescue`, resolvedScope === 'buyer' ? 'buyers' : resolvedScope === 'supplier' ? 'suppliers' : null) : buildOrdersHref({ handoff: 'dashboard-execution' }, resolvedScope === 'buyer' ? 'buyers' : resolvedScope === 'supplier' ? 'suppliers' : null)} className="inline-flex rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
              {actionSummary.overdueFollowUpCount > 0 ? 'Clear overdue follow-ups' : actionSummary.draftQuoteCount > 0 ? 'Open the rescue board' : 'Open execution workspace'}
            </Link>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Link href={withMode(`${PRODUCT_ROUTES.app.pipeline}?handoff=dashboard-open-pipeline`, resolvedScope === 'buyer' ? 'buyers' : resolvedScope === 'supplier' ? 'suppliers' : null)} className="font-semibold text-slate-700 hover:text-slate-900">Pipeline</Link>
              <Link href={withMode(`${PRODUCT_ROUTES.app.leads}?handoff=dashboard-open-follow-up`, resolvedScope === 'buyer' ? 'buyers' : resolvedScope === 'supplier' ? 'suppliers' : null)} className="font-semibold text-slate-700 hover:text-slate-900">Follow-up</Link>
              <Link href={buildOrdersHref({ handoff: 'dashboard-open-orders' }, resolvedScope === 'buyer' ? 'buyers' : resolvedScope === 'supplier' ? 'suppliers' : null)} className="font-semibold text-slate-700 hover:text-slate-900">Orders</Link>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-3">
        <StateMessage
          title="What leadership should check first"
          description={`${actionSummary.overdueFollowUpCount} follow-ups are overdue and ${actionSummary.draftQuoteCount} quotes are still in governed motion. Use this as the fast intervention surface before drilling into individual workspaces.`}
          tone={actionSummary.pendingActionCount > 0 ? 'warning' : 'success'}
        />      </div>


      <div className="grid gap-3 lg:grid-cols-2">
        <AICompactActionBrief
          lane="Dashboard"
          where={resolvedScope === 'all' ? 'Leadership watchtower · mixed view' : resolvedScope === 'buyer' ? 'Leadership watchtower · buyer view' : 'Leadership watchtower · supplier view'}
          blocker={actionSummary.pendingActionCount > 0 ? `${actionSummary.pendingActionCount} records still need intervention before they become clean revenue or execution progress.` : 'No immediate action pile-up is visible right now.'}
          nextAction={actionSummary.overdueFollowUpCount > 0 ? 'Open follow-up command center first and clear the oldest overdue record.' : actionSummary.draftQuoteCount > 0 ? 'Open quote or pipeline surfaces and clear the oldest governed quote decision.' : 'Stay on the dashboard and monitor for the next lane that begins drifting.'}
          guardrail="AI can compress the watchtower read into one next move. It cannot replace lane-level proof, approvals, or operator judgment."
          details={[
            `${actionSummary.overdueFollowUpCount} overdue follow-up item${actionSummary.overdueFollowUpCount === 1 ? '' : 's'} are visible.`,
            `${actionSummary.draftQuoteCount} quote${actionSummary.draftQuoteCount === 1 ? '' : 's'} remain in governed motion.`,
            resolvedScope === 'all' ? 'Mixed mode is combining buyer and supplier movement on purpose.' : `Scope is narrowed to ${resolvedScope} work.`
          ]}
          tone={actionSummary.pendingActionCount > 0 ? 'warning' : 'neutral'}
        />
        <AICompactActionBrief
          lane="Dashboard"
          where="Intervention routing"
          blocker={actionSummary.recentInbound.length > 0 ? `Recent inbound records exist, but they still need explicit next-action ownership.` : 'No new public-card inbound records are visible in the fast summary.'}
          nextAction={actionSummary.recentInbound.length > 0 ? `Review ${actionSummary.recentInbound[0]?.company_name ?? 'the latest inbound lead'} and decide whether it belongs in Capture, Follow-up, or Pipeline.` : 'Use the rescue board or leads workspace for the next governed intervention.'}
          guardrail="AI can route attention, not auto-qualify records or skip workflow checkpoints."
          details={actionSummary.recentInbound.length > 0 ? actionSummary.recentInbound.map((item) => `${item.company_name ?? 'Unknown company'} · ${item.source_label ?? 'source unknown'} · ${formatRelativeTimestamp(item.created_at ?? null)}`) : ['No fresh inbound cards are visible in this summary window.']}
          tone={actionSummary.recentInbound.length > 0 ? 'warning' : 'neutral'}
        />
      </div>

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
