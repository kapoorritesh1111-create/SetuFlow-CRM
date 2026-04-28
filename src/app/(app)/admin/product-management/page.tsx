import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { StateMessage } from '@/components/ui/state-message';
import { SectionCard } from '@/components/ui/section-card';
import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { getProductsData } from '@/lib/queries/products';
import { buildProductsViewModel } from '@/features/products/view-model';
import { ProductsManager } from '@/features/products/components/products-manager';

function ratioLabel(done: number, total: number) {
  return total > 0 ? `${done}/${total}` : '0/0';
}

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
  const variants = data.variants ?? [];
  const activeProducts = products.filter((product) => product.isActive);
  const uomCounts = {
    case: variants.filter((variant: any) => String(variant.pricing_mode_default ?? '').toLowerCase() === 'case').length,
    unit: variants.filter((variant: any) => ['unit', ''].includes(String(variant.pricing_mode_default ?? '').toLowerCase())).length,
    kg: variants.filter((variant: any) => String(variant.pricing_mode_default ?? '').toLowerCase() === 'kg').length,
  };
  const tradeReadyCount = activeProducts.filter((product) => Boolean(product.hsnCode) && Boolean(product.packSize)).length;
  const pricedActiveCount = activeProducts.filter((product) => product.baselineStatus !== 'missing').length;
  const approvalProtectedCount = activeProducts.filter((product) => product.pricingEntries.length > 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Product management"
        badge="System of record"
        description="Admin-owned catalog governance for categories, products, packaging, UOM, base pricing, and the approval-protected commercial posture used by leads, quotes, and orders."
        actions={[
          { label: 'Organization', href: '/admin/organization' },
          { label: 'Settings lists', href: '/settings/lists' },
          { label: 'Products workspace', href: '/products', type: 'primary' },
        ]}
      />

      {readOnlyMessage ? <StateMessage title="Read-only product governance" description={readOnlyMessage} tone="warning" /> : null}
      <QueryIssuesAlert issues={data.queryIssues} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SectionCard eyebrow="Catalog governance" title={ratioLabel(summary.activeProducts, summary.totalProducts)} description="Active products under admin control.">
          <p className="text-sm text-slate-600">{summary.totalCategories} categories · {summary.totalVariants} sellable variants in the current repo baseline.</p>
        </SectionCard>
        <SectionCard eyebrow="Base pricing" title={ratioLabel(pricedActiveCount, activeProducts.length)} description="Active products with a catalog baseline.">
          <p className="text-sm text-slate-600">Catalog-led quoting stays primary and visible before any manual override is requested.</p>
        </SectionCard>
        <SectionCard eyebrow="Trade attributes" title={ratioLabel(tradeReadyCount, activeProducts.length)} description="Active products with HS code and packaging captured.">
          <p className="text-sm text-slate-600">Packaging comes from pack size and variant pack labels. HS code posture remains visible in the product source of truth.</p>
        </SectionCard>
        <SectionCard eyebrow="Approval posture" title={ratioLabel(approvalProtectedCount, activeProducts.length)} description="Products with governed pricing rows available to Quotes.">
          <p className="text-sm text-slate-600">Manual quote overrides still require reason capture and approval routing; this page does not weaken that logic.</p>
        </SectionCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <SectionCard eyebrow="Units of measure" title="UOM coverage" description="Default commercial unit is carried by the variant pricing mode.">
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>Case-led variants: {uomCounts.case}</li>
            <li>Unit-led variants: {uomCounts.unit}</li>
            <li>Kg-led variants: {uomCounts.kg}</li>
          </ul>
        </SectionCard>
        <SectionCard eyebrow="Lead bridge" title="Product/category interest is first-class" description="Leads map to category-backed product selections before quoting begins.">
          <p className="text-sm text-slate-600">This admin surface owns the catalog records that appear in lead coverage selection and downstream quote product pickers.</p>
        </SectionCard>
        <SectionCard eyebrow="Order continuity" title="Quote lines remain traceable" description="Accepted quote lines continue into contract-backed order execution.">
          <p className="text-sm text-slate-600">Orders now read confirmed commercial lines instead of only quote headers so operators can verify pack, quantity, baseline, and override posture.</p>
        </SectionCard>
      </section>

      <ProductsManager
        categories={categories}
        products={products}
        markets={(data.markets ?? []).map((market) => ({ id: market.id, name: market.name, isActive: Boolean(market.is_active) }))}
        auditEvents={data.auditEvents}
      />
    </div>
  );
}
