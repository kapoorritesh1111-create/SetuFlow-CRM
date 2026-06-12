import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { StateMessage } from '@/components/ui/state-message';
import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { normalizeWorkspaceRoles } from '@/lib/workspace/roles';
import { getProductsData } from '@/lib/queries/products';
import { buildProductsViewModel } from '@/features/products/view-model';
import type { PricingCalculatorDefaultRule } from '@/features/admin/components/product-governance-workbench';
import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { createClient } from '@/lib/supabase/server';

type ProductManagementMarket = {
  id: string;
  name: string;
  is_active: boolean | null;
};

type CatalogGovernanceMetric = {
  label: string;
  value: string | number;
  helper: string;
  tone?: 'neutral' | 'blue' | 'warning' | 'success';
};

const chipClass = 'rounded-full border px-2.5 py-1 text-[10px] font-bold';
const actionClass = 'rounded-lg border px-3 py-1.5 text-[11px] font-bold transition';

function metricClass(tone: CatalogGovernanceMetric['tone']) {
  if (tone === 'blue') return 'border-blue-200 bg-blue-50';
  if (tone === 'warning') return 'border-amber-200 bg-amber-50';
  if (tone === 'success') return 'border-emerald-200 bg-emerald-50';
  return 'border-slate-200 bg-white';
}

function CatalogGovernanceCommandPage({
  productsCount,
  categoriesCount,
  marketsCount,
  pricingRules,
  unpricedProducts,
  queryIssues,
  readOnlyMessage,
}: {
  productsCount: number;
  categoriesCount: number;
  marketsCount: number;
  pricingRules: PricingCalculatorDefaultRule[];
  unpricedProducts: number;
  queryIssues: unknown;
  readOnlyMessage: string | null;
}) {
  const metrics: CatalogGovernanceMetric[] = [
    { label: 'Products', value: productsCount, helper: 'catalog masters', tone: 'blue' },
    { label: 'Pricing gaps', value: unpricedProducts, helper: 'need coverage', tone: unpricedProducts > 0 ? 'warning' : 'success' },
    { label: 'Variant gaps', value: 0, helper: 'need setup', tone: 'warning' },
    { label: 'Import blockers', value: 0, helper: 'recent blocked rows', tone: 'success' },
    { label: 'Audit', value: 0, helper: 'recent records' },
  ];

  return (
    <>
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-5 py-2.5 shadow-[0_1px_4px_rgba(15,23,42,0.05)]">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Trade Setup</p>
          <h1 className="text-base font-extrabold tracking-[-0.02em] text-slate-950">Catalog Governance</h1>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
          <span className={`${chipClass} border-blue-200 bg-blue-50 text-blue-700`}>Import wizard</span>
          <span className={`${chipClass} border-emerald-200 bg-emerald-50 text-emerald-700`}>Cleanup guard on</span>
          <Link href="/products" className={`${actionClass} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}>Open Products</Link>
          <Link href="/admin/product-management#imports" className={`${actionClass} border-blue-900 bg-blue-900 text-white hover:bg-blue-950`}>Import CSV</Link>
          <Link href="/admin/product-management#cleanup" className={`${actionClass} border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100`}>Run cleanup check</Link>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4 lg:px-5 lg:py-4" data-admin-v2-foundation="S24-ADMUX-24" data-admin-v2-page="catalog-governance">
        {readOnlyMessage ? <StateMessage title="Read-only Catalog Admin" description={readOnlyMessage} tone="warning" /> : null}
        <QueryIssuesAlert issues={queryIssues as any} />

        <section className="rounded-[13px] border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex gap-3 text-xs leading-5 text-slate-600">
            <span className="text-sm" aria-hidden="true">🗄️</span>
            <div>
              <p className="font-extrabold text-slate-950">Why is this separate from Catalog?</p>
              <p>The main <strong>/products</strong> catalog is for daily product editing. The Catalog tab manages taxonomy + pricing rules.</p>
              <p>This page is for <strong>governance-only</strong> tasks: CSV imports, import audit history, and protected cleanup.</p>
            </div>
          </div>
        </section>

        <div className="flex overflow-x-auto border-b border-slate-200">
          <button className="border-b-[2.5px] border-blue-900 px-4 py-2.5 text-xs font-extrabold text-blue-900">Overview</button>
          <button className="border-b-[2.5px] border-transparent px-4 py-2.5 text-xs font-semibold text-slate-500">Import wizard</button>
          <button className="border-b-[2.5px] border-transparent px-4 py-2.5 text-xs font-semibold text-slate-500">Data cleanup</button>
          <button className="border-b-[2.5px] border-transparent px-4 py-2.5 text-xs font-semibold text-slate-500">Import history</button>
        </div>

        <section className="overflow-hidden rounded-[13px] border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="grid gap-2 p-4 md:grid-cols-5">
            {metrics.map((metric) => (
              <div key={metric.label} className={`rounded-[11px] border p-3 ${metricClass(metric.tone)}`}>
                <div className="text-xl font-extrabold tracking-[-0.03em] text-slate-950">{metric.value}</div>
                <div className="mt-1 text-[8px] font-extrabold uppercase tracking-[0.14em] text-slate-400">{metric.label}</div>
                <div className="mt-1 text-[10.5px] text-slate-500">{metric.helper}</div>
              </div>
            ))}
          </div>
          <div className="grid gap-3 border-t border-slate-100 p-4 md:grid-cols-2">
            <div className="rounded-[9px] border border-blue-200 bg-blue-50 p-3 text-xs leading-6 text-blue-900">
              <p className="font-extrabold">Setup order</p>
              <p>1. Pricing calculator defaults</p>
              <p>2. Category hierarchy</p>
              <p>3. Products + variants</p>
            </div>
            <div className="rounded-[9px] border border-emerald-200 bg-emerald-50 p-3 text-xs leading-6 text-emerald-900">
              <p className="font-extrabold">Cleanup boundary</p>
              <p>Product deletion is owner/admin-only and protected by 2 years of quote/order history.</p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[13px] border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[8.5px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Governance status</p>
              <h2 className="text-sm font-extrabold text-slate-950">Admin workbench</h2>
            </div>
            <span className={`${chipClass} border-blue-200 bg-blue-50 text-blue-700`}>{categoriesCount} categories</span>
            <span className={`${chipClass} border-blue-200 bg-blue-50 text-blue-700`}>{marketsCount} markets</span>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-extrabold text-slate-950">Setup order</p>
              <p className="mt-2 text-xs leading-6 text-slate-600">Pricing calculator defaults come first, categories second, products and variants third.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-extrabold text-slate-950">Master data</p>
              <p className="mt-2 text-xs leading-6 text-slate-600">{categoriesCount} categories and {marketsCount} active markets support {productsCount} catalog products.</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-extrabold text-slate-950">Cleanup boundary</p>
              <p className="mt-2 text-xs leading-6 text-slate-600">Product deletion is protected by quote, order, and audit history.</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-extrabold text-slate-950">Import history</p>
              <p className="mt-2 text-xs leading-6 text-slate-600">0 recent import runs are available for audit review and row-summary download.</p>
            </div>
          </div>
        </section>

        {pricingRules.length === 0 ? (
          <Link href="/admin/pricing" className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 transition hover:bg-amber-100">
            <span className="text-base" aria-hidden="true">💰</span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-extrabold text-amber-800">Pricing defaults first</span>
              <span className="mt-0.5 block text-[10.5px] text-slate-500">Set pricing defaults before large imports or cleanup passes.</span>
            </span>
            <span className="text-base font-bold text-amber-700" aria-hidden="true">→</span>
          </Link>
        ) : null}
      </div>
    </>
  );
}

export default async function ProductManagementPage() {
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
  const { data: ruleRows, error: ruleError } = await supabase
    .from('pricing_calculator_default_rules')
    .select('id, organization_id, rule_scope, category_id, currency, margin_mode, inland_transport_cost, export_customs_cost, port_handling_cost, freight_cost, insurance_cost, import_duty_percent, destination_charges, local_delivery_cost, internal_margin_percent, distributor_margin_percent, retail_margin_percent, is_active')
    .eq('organization_id', workspace.organization.id)
    .eq('is_active', true);

  if (ruleError) return <StateMessage title="Pricing rules could not load" description={ruleError.message} tone="warning" />;

  const { categories, products, summary } = buildProductsViewModel(data);
  const markets = ((data.markets ?? []) as ProductManagementMarket[]).map((market) => ({ id: market.id, name: market.name, isActive: Boolean(market.is_active) }));
  const activeMarkets = markets.filter((market) => market.isActive).length;
  const missingCount = summary.unpricedProducts === 0 && canCleanupProducts ? 0 : 1;

  return (
    <AdminSettingsShell active="product-management" organizationName={workspace.organization.name} missingCount={missingCount}>
      <CatalogGovernanceCommandPage
        productsCount={products.length}
        categoriesCount={categories.length}
        marketsCount={activeMarkets}
        pricingRules={(ruleRows ?? []) as PricingCalculatorDefaultRule[]}
        unpricedProducts={summary.unpricedProducts}
        queryIssues={data.queryIssues}
        readOnlyMessage={readOnlyMessage}
      />
    </AdminSettingsShell>
  );
}
