import { WorkspaceState } from '@/components/ui/workspace-state';
import { ProductsSpreadsheetPage } from '@/features/products/components/products-spreadsheet-page';
import { ProductPricingIntelligencePanel } from '@/features/products/components/product-pricing-intelligence-panel';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationVerticals } from '@/lib/verticals/capability';
import { getPackagingFamilies, getPackagingTemplates } from '@/lib/packaging/queries';
import PackagingCatalog from '@/features/packaging/components/packaging-catalog';

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

  const mode = normalizeMode(searchParams?.mode);

  // S24-SPEN-202: packaging-vertical organizations get the service-family
  // catalog by default. The classic product manager remains available at
  // ?mode=products so nothing is removed for any workspace.
  if (!mode) {
    const supabase = await createClient();
    const verticals = await getOrganizationVerticals(workspace.organization.id, supabase);
    if (verticals.packagingEnabled) {
      const [families, templates] = await Promise.all([
        getPackagingFamilies(workspace.organization.id, supabase),
        getPackagingTemplates(workspace.organization.id, supabase),
      ]);
      return (
        <PackagingCatalog
          families={families}
          templates={templates}
          showTrialBadge={verticals.source === 'packaging_converter_trial'}
        />
      );
    }
  }

  const canManageCatalog = hasWorkspaceCapability(workspace.currentRoles, 'catalog.manage');
  const readOnlyMessage = canManageCatalog
    ? null
    : getReadOnlyWorkspaceMessage(workspace.currentRoles, 'catalog.manage') ?? 'Your current role can review products, but only catalog managers can create or edit pricing.';

  return (
    <div className="space-y-3">
      {mode === 'pricing' ? <ProductPricingIntelligencePanel compact /> : null}
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
