import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { StateMessage } from '@/components/ui/state-message';
import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { getProductsData } from '@/lib/queries/products';
import { buildProductsViewModel } from '@/features/products/view-model';
import { ProductGovernanceWorkbench, type PricingCalculatorDefaultRule } from '@/features/admin/components/product-governance-workbench';
import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { createClient } from '@/lib/supabase/server';

function noticeFor(code?: string) {
  if (code === 'pricing-rule-saved') return { title: 'Pricing rule saved', description: 'Default pricing calculator rule has been saved.', tone: 'success' as const };
  if (code === 'pricing-rule-category-required') return { title: 'Choose a category', description: 'Select a category before saving a category-level pricing rule.', tone: 'warning' as const };
  if (code === 'pricing-rule-error') return { title: 'Pricing rule was not saved', description: 'Supabase rejected the save. Check required fields and try again.', tone: 'danger' as const };
  return null;
}

export default async function ProductManagementPage({ searchParams }: { searchParams?: { notice?: string } }) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return <EmptyState title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded." />;
  }

  const canManageCatalog = hasWorkspaceCapability(workspace.currentRoles, 'catalog.manage');
  const readOnlyMessage = canManageCatalog
    ? null
    : getReadOnlyWorkspaceMessage(workspace.currentRoles, 'catalog.manage') ?? 'Your current role can review product management, but only catalog managers can edit the source of truth.';

  const data = await getProductsData(workspace.organization.id);
  if (!data) {
    return <EmptyState title="Product management unavailable" description="Product management needs a working data connection before the admin system of record can load." />;
  }

  const supabase = await createClient();
  const { data: ruleRows } = await (supabase as any)
    .from('pricing_calculator_default_rules')
    .select('id, organization_id, rule_scope, category_id, currency, margin_mode, inland_transport_cost, export_customs_cost, port_handling_cost, freight_cost, insurance_cost, import_duty_percent, destination_charges, local_delivery_cost, internal_margin_percent, distributor_margin_percent, retail_margin_percent, is_active')
    .eq('organization_id', workspace.organization.id)
    .eq('is_active', true);

  const { categories, products, summary } = buildProductsViewModel(data);
  const notice = noticeFor(searchParams?.notice);

  return (
    <AdminSettingsShell active="product-management" organizationName={workspace.organization.name} missingCount={summary.unpricedProducts === 0 ? 0 : 1}>
      <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Product management"
        badge="Governance"
        description="Monitor catalog readiness, setup gaps, import health, and governed pricing controls."
      />

      {notice ? <StateMessage title={notice.title} description={notice.description} tone={notice.tone} /> : null}
      {readOnlyMessage ? <StateMessage title="Read-only product governance" description={readOnlyMessage} tone="warning" /> : null}
      <QueryIssuesAlert issues={data.queryIssues} />

      <ProductGovernanceWorkbench
        categories={categories}
        products={products}
        markets={(data.markets ?? []).map((market) => ({ id: market.id, name: market.name, isActive: Boolean(market.is_active) }))}
        summary={summary}
        auditEvents={data.auditEvents}
        canManageCatalog={canManageCatalog}
        pricingRules={(ruleRows ?? []) as PricingCalculatorDefaultRule[]}
      />
      </div>
    </AdminSettingsShell>
  );
}
