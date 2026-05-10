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

        <ProductGovernanceWorkbench
          categories={categories}
          products={products}
          markets={(data.markets ?? []).map((market) => ({ id: market.id, name: market.name, isActive: Boolean(market.is_active) }))}
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
