import { WorkspaceState } from '@/components/ui/workspace-state';
import { ProductsSpreadsheetPage } from '@/features/products/components/products-spreadsheet-page';
import { ProductPricingIntelligencePanel } from '@/features/products/components/product-pricing-intelligence-panel';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';

type ProductsSearchParams = {
  search?: string;
  category?: string;
  pricing_mode?: string;
  gap?: string;
  active?: string;
  quoteable?: string;
  mode?: string;
};

function normalizeMode(mode: string | undefined): 'products' | 'pricing' | 'spreadsheet' | undefined {
  if (mode === 'pricing' || mode === 'spreadsheet' || mode === 'products') return mode;
  return undefined;
}

export default async function ProductsPage({ searchParams }: { searchParams?: ProductsSearchParams }) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return (
      <WorkspaceState
        eyebrow="Catalog"
        title="Workspace membership needed"
        description="Your account is signed in, but no active organization membership could be loaded."
        primaryActionHref="/dashboard"
        primaryActionLabel="Go to Overview"
      />
    );
  }

  const canManageCatalog = hasWorkspaceCapability(workspace.currentRoles, 'catalog.manage');
  const readOnlyMessage = canManageCatalog
    ? null
    : getReadOnlyWorkspaceMessage(workspace.currentRoles, 'catalog.manage') ?? 'Your current role can review products, but only catalog managers can create or edit pricing.';
  const mode = normalizeMode(searchParams?.mode);

  return (
    <div className="space-y-3">
      {mode === 'pricing' ? <ProductPricingIntelligencePanel /> : null}
      <ProductsSpreadsheetPage
        canManageCatalog={canManageCatalog}
        readOnlyMessage={readOnlyMessage}
        initialFilters={{
          search: searchParams?.search,
          category: searchParams?.category,
          pricingMode: searchParams?.pricing_mode,
          gap: searchParams?.gap,
          active: searchParams?.active,
          quoteable: searchParams?.quoteable,
          mode,
        }}
      />
    </div>
  );
}
