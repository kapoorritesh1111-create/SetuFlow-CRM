import { EmptyState } from '@/components/ui/empty-state';
import { StateMessage } from '@/components/ui/state-message';
import Link from 'next/link';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
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
      <StateMessage
        title={resolvedScope === 'buyer'
          ? 'Buyer mode is active on this dashboard'
          : resolvedScope === 'supplier'
            ? 'Supplier mode is active on this dashboard'
            : 'Mixed buyer and supplier view is active on this dashboard'}
        description={resolvedScope === 'buyer'
          ? 'This view is prioritizing buyer-side commercial movement with evidence-backed order forcing and bounded AI routing. The primary action is to create or qualify the next lead, then clear the next governed blocker.'
          : resolvedScope === 'supplier'
            ? 'This view is prioritizing supplier-side sourcing movement with compliance and dispatch evidence visible and bounded AI routing available. The primary action is to progress the next supplier record until its blockers are cleared.'
            : 'This view combines buyer and supplier activity. Use the primary capture action first, then route the record through Lead to Quote and finally into governed order execution, with AI only recommending safe next actions from repo truth.'}
        tone="neutral"
      />

      <div className="grid gap-3 lg:grid-cols-4">
        <StateMessage
          title="Evidence-backed action forcing comes first"
          description={`${actionSummary.pendingActionCount} items need movement before they can become revenue or execution progress.`}
          tone="neutral"
        />
        <Link href={PRODUCT_ROUTES.app.capture} className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">Capture new contact</Link>
        <Link href={PRODUCT_ROUTES.app.leads} className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">Open leads queue</Link>
        <Link href={PRODUCT_ROUTES.app.orders} className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">Open execution workspace</Link>
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
