import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { StateMessage } from '@/components/ui/state-message';
import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { getProductsData } from '@/lib/queries/products';
import { buildProductsViewModel } from '@/features/products/view-model';
import { ProductGovernanceWorkbench } from '@/features/admin/components/product-governance-workbench';
import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';


export default async function ProductManagementPage() {
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

  const { categories, products, summary } = buildProductsViewModel(data);

  return (
    <AdminSettingsShell active="product-management" organizationName={workspace.organization.name} missingCount={summary.unpricedProducts === 0 ? 0 : 1}>
      <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Product management"
        badge="Governance"
        description="Monitor catalog readiness, setup gaps, import health, and governed pricing controls."
      />

      {readOnlyMessage ? <StateMessage title="Read-only product governance" description={readOnlyMessage} tone="warning" /> : null}
      <QueryIssuesAlert issues={data.queryIssues} />

      <ProductGovernanceWorkbench
        categories={categories}
        products={products}
        markets={(data.markets ?? []).map((market) => ({ id: market.id, name: market.name, isActive: Boolean(market.is_active) }))}
        summary={summary}
        auditEvents={data.auditEvents}
        canManageCatalog={canManageCatalog}
      />
      </div>
    </AdminSettingsShell>
  );
}
