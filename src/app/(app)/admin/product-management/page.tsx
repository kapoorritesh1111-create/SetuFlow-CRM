import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { StateMessage } from '@/components/ui/state-message';
import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { getProductsData } from '@/lib/queries/products';
import { buildProductsViewModel } from '@/features/products/view-model';
import { ProductsManager } from '@/features/products/components/products-manager';
import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';

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
    <AdminSettingsShell active="product-management" organizationName={workspace.organization.name} missingCount={pricedActiveCount === activeProducts.length ? 0 : 1}>
      <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Product management"
        badge="Governance"
        description="Manage catalog records, coverage, import tools, and governed product pricing."
        actions={[
          { label: 'Organization', href: '/admin/organization' },
          { label: 'Settings lists', href: '/admin/organization#settings-lists' },
          { label: 'Products workspace', href: '/products', type: 'primary' },
        ]}
      />

      {readOnlyMessage ? <StateMessage title="Read-only product governance" description={readOnlyMessage} tone="warning" /> : null}
      <QueryIssuesAlert issues={data.queryIssues} />

      <details className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm open:p-5">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800">? Help: how this product governance page works</summary>
        <div className="mt-4 grid gap-4 text-sm text-slate-600 lg:grid-cols-3">
          <div>
            <h3 className="font-semibold text-slate-950">Catalog source of truth</h3>
            <p className="mt-1">This admin page governs product names, categories, variants, pack details, UOM defaults, activation, and import/export maintenance.</p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-950">Pricing posture</h3>
            <p className="mt-1">Product-level EXW to Retail calculator snapshots are visible here, while quote pricing rules stay protected until quote integration is intentionally upgraded.</p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-950">Workflow continuity</h3>
            <p className="mt-1">Lead product interests, quote rows, and order execution continue to trace back to governed product and variant records.</p>
          </div>
        </div>
      </details>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Products', value: ratioLabel(summary.activeProducts, summary.totalProducts), detail: `${summary.totalCategories} categories` },
          { label: 'Pricing', value: ratioLabel(pricedActiveCount, activeProducts.length), detail: 'baseline coverage' },
          { label: 'Trade attrs', value: ratioLabel(tradeReadyCount, activeProducts.length), detail: 'HS + pack captured' },
          { label: 'Approval rows', value: ratioLabel(approvalProtectedCount, activeProducts.length), detail: 'governed pricing rows' },
          { label: 'Variants', value: String(summary.totalVariants), detail: `${uomCounts.case} case · ${uomCounts.unit} unit · ${uomCounts.kg} kg` },
        ].map((metric) => (
          <div key={metric.label} className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-slate-500">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{metric.value}</p>
            <p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
          </div>
        ))}
      </section>

      <ProductsManager
        categories={categories}
        products={products}
        markets={(data.markets ?? []).map((market) => ({ id: market.id, name: market.name, isActive: Boolean(market.is_active) }))}
        auditEvents={data.auditEvents}
      />
      </div>
    </AdminSettingsShell>
  );
}
