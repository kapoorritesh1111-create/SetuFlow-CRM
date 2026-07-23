import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { StateMessage } from '@/components/ui/state-message';
import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { normalizeWorkspaceRoles } from '@/lib/workspace/roles';
import { getProductsData } from '@/lib/queries/products';
import { buildProductsViewModel } from '@/features/products/view-model';
import { ProductGovernanceWorkbench, type PricingCalculatorDefaultRule } from '@/features/admin/components/product-governance-workbench';
import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { createClient } from '@/lib/supabase/server';

type ProductManagementMarket = {
  id: string;
  name: string;
  is_active: boolean | null;
};

export default async function ProductManagementPage({ searchParams }: { searchParams?: { notice?: string } }) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return <EmptyState title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded." />;
  }

  const canManageCatalog = hasWorkspaceCapability(workspace.currentRoles, 'catalog.manage');
  const normalizedRoles = normalizeWorkspaceRoles(workspace.currentRoles);
  const canCleanupProducts = normalizedRoles.includes('owner') || normalizedRoles.includes('admin');
  const readOnlyMessage = canManageCatalog
    ? null
    : getReadOnlyWorkspaceMessage(workspace.currentRoles, 'catalog.manage') ?? 'Your current role can review Catalog Admin, but only catalog managers can change setup, imports, and pricing defaults.';

  const data = await getProductsData(workspace.organization.id);
  if (!data) {
    return <EmptyState title="Catalog Admin unavailable" description="Catalog Admin needs a working data connection before setup, import, and governance controls can load." />;
  }

  const supabase = await createClient();
  const { data: ruleRows } = await (supabase as any)
    .from('pricing_calculator_default_rules')
    .select('id, organization_id, rule_scope, category_id, currency, margin_mode, inland_transport_cost, export_customs_cost, port_handling_cost, freight_cost, insurance_cost, import_duty_percent, destination_charges, local_delivery_cost, internal_margin_percent, distributor_margin_percent, retail_margin_percent, is_active')
    .eq('organization_id', workspace.organization.id)
    .eq('is_active', true);

  const { categories, products, summary } = buildProductsViewModel(data);
  const markets = ((data.markets ?? []) as ProductManagementMarket[]).map((market) => ({ id: market.id, name: market.name, isActive: Boolean(market.is_active) }));

  return (
    <AdminSettingsShell active="product-management" organizationName={workspace.organization.name} missingCount={summary.unpricedProducts === 0 ? 0 : 1}>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Admin"
          title="Catalog Admin"
          badge="Setup & governance"
          description="Back-office control center for pricing-first setup, imports, owner/admin product cleanup, readiness issues, and audit. Use Products for daily product row editing."
        />

        {readOnlyMessage ? <StateMessage title="Read-only Catalog Admin" description={readOnlyMessage} tone="warning" /> : null}
        {searchParams?.notice ? <StateMessage title="Catalog Admin notice" description={searchParams.notice} tone="neutral" /> : null}
        <QueryIssuesAlert issues={data.queryIssues} />

        <div className="flex gap-2.5 rounded-ctl border border-slate-200 bg-white px-3.5 py-3">
          <span aria-hidden="true" className="text-base">🗄️</span>
          <div>
            <p className="text-xs font-bold text-slate-900">Why is this separate from Catalog?</p>
            <p className="mt-1 text-[11px] leading-[1.6] text-slate-500">
              The main <strong>/products</strong> catalog is for daily product editing, and the Catalog page manages taxonomy + pricing rules. This page is for <strong>governance-only</strong> tasks most users never need: CSV imports, import audit history, and protected product deletion with a 2-year quote/order guard. Owner/admin only.
            </p>
          </div>
        </div>
        <ProductGovernanceWorkbench
          categories={categories}
          products={products}
          markets={markets}
          summary={summary}
          auditEvents={data.auditEvents}
          canManageCatalog={canManageCatalog}
          canCleanupProducts={canCleanupProducts}
          pricingRules={(ruleRows ?? []) as PricingCalculatorDefaultRule[]}
        />
      </div>
    </AdminSettingsShell>
  );
}
