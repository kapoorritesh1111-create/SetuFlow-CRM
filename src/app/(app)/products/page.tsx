import { WorkspaceState } from '@/components/ui/workspace-state';
import { ProductsSpreadsheetPage } from '@/features/products/components/products-spreadsheet-page';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';

export default async function ProductsPage() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return (
      <WorkspaceState
        eyebrow="Products workspace"
        title="Workspace membership needed"
        description="Your account is signed in, but no active organization membership could be loaded."
        primaryActionHref="/dashboard"
        primaryActionLabel="Go to dashboard"
      />
    );
  }

  const canManageCatalog = hasWorkspaceCapability(workspace.currentRoles, 'catalog.manage');
  const readOnlyMessage = canManageCatalog
    ? null
    : getReadOnlyWorkspaceMessage(workspace.currentRoles, 'catalog.manage') ?? 'Your current role can review products, but only catalog managers can create or edit pricing.';

  return <ProductsSpreadsheetPage canManageCatalog={canManageCatalog} readOnlyMessage={readOnlyMessage} />;
}
