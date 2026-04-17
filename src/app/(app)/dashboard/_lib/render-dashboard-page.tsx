import { EmptyState } from '@/components/ui/empty-state';
import { StateMessage } from '@/components/ui/state-message';
import { SectionCard } from '@/components/ui/section-card';
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
          ? 'This view is prioritizing buyer-side commercial movement. The primary action is to create or qualify the next lead, then move it into Quote.'
          : resolvedScope === 'supplier'
            ? 'This view is prioritizing supplier-side sourcing movement. The primary action is to progress the next supplier record until it is quote-ready.'
            : 'This view combines buyer and supplier activity. Use the primary capture action first, then route the record through Lead to Quote and finally into Orders.'}
        tone="neutral"
      />

      <SectionCard>
        <div className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Next step guidance</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Turn dashboard insight into pipeline movement</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">The dashboard is the command layer, not the finishing point. Start the next commercial record, pick up pending actions, and watch fresh public-card demand from here.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={PRODUCT_ROUTES.app.capture} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">Capture new contact</Link>
              <Link href={PRODUCT_ROUTES.app.leads} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Open leads</Link>
              <Link href={PRODUCT_ROUTES.app.orders} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Open orders</Link>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.05fr_1.05fr_0.9fr_1.2fr]">
            <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">New lead</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">Start a fresh commercial record</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Use Capture when the next buyer or supplier contact needs to enter the CRM cleanly.</p>
              <Link href={PRODUCT_ROUTES.app.capture} className="mt-4 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">New Lead</Link>
            </article>

            <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">New quote</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">Open commercial work already in motion</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{actionSummary.draftQuoteCount} active quote workspace{actionSummary.draftQuoteCount === 1 ? '' : 's'} need attention before they can move into Orders.</p>
              <Link href={PRODUCT_ROUTES.app.quotes} className="mt-4 inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">New Quote</Link>
            </article>

            <article className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Pending actions</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{actionSummary.pendingActionCount}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{actionSummary.overdueFollowUpCount} overdue follow-up{actionSummary.overdueFollowUpCount === 1 ? '' : 's'} and {actionSummary.draftQuoteCount} active quote workspace{actionSummary.draftQuoteCount === 1 ? '' : 's'}.</p>
              <Link href={PRODUCT_ROUTES.app.leads} className="mt-4 inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Review queue</Link>
            </article>

            <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Recent inbound card activity</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">Live public-card demand</p>
                </div>
                <Link href={PRODUCT_ROUTES.app.myCard} className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">My Card</Link>
              </div>
              <div className="mt-4 space-y-3">
                {actionSummary.recentInbound.length ? actionSummary.recentInbound.map((item) => (
                  <div key={item.id} className="rounded-[1.1rem] border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                    <p className="text-sm font-semibold text-slate-900">{item.company_name || item.contact_name || 'Inbound card request'}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{item.source_label || 'Public Card'} · {formatRelativeTimestamp(item.created_at)}</p>
                  </div>
                )) : (
                  <p className="rounded-[1.1rem] border border-dashed border-slate-200 bg-slate-50/70 px-3 py-4 text-sm leading-6 text-slate-500">Recent quote requests and appointments from shared cards will appear here once buyers start responding.</p>
                )}
              </div>
            </article>
          </div>
        </div>
      </SectionCard>

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
