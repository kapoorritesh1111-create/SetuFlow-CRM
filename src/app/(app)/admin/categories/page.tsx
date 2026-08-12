import Link from 'next/link';
import { StateMessage } from '@/components/ui/state-message';
import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { CategoriesGovernanceWorkbench } from '@/features/admin/components/categories-governance-workbench';
import type { PricingCalculatorDefaultRule } from '@/features/admin/components/product-governance-workbench';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

type CategoryRow = {
  id: string;
  name: string;
  sort_order: number | null;
  is_active: boolean | null;
  parent_id: string | null;
  products?: { id: string }[] | null;
};

type ProductRow = { id: string; category_id: string | null };

const chipClass = 'rounded-full border px-2.5 py-1 text-[10px] font-bold';
const actionClass = 'rounded-lg border px-3 py-1.5 text-[11px] font-bold transition';

export default async function Page() {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  const { missingEnv, membership, organization } = await requireAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  if (!membership || !organization) return null;

  const supabase = await createClient();
  const [categoriesResult, productsResult, pricingRulesResult, brochuresResult] = await Promise.all([
    supabase
      .from('product_categories')
      .select('id, name, sort_order, is_active, parent_id, products(id)')
      .eq('organization_id', organization.id)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('products')
      .select('id, category_id')
      .eq('organization_id', organization.id),
    supabase
      .from('pricing_calculator_default_rules')
      .select('id, organization_id, rule_scope, category_id, currency, margin_mode, inland_transport_cost, export_customs_cost, port_handling_cost, freight_cost, insurance_cost, import_duty_percent, destination_charges, local_delivery_cost, internal_margin_percent, distributor_margin_percent, retail_margin_percent, is_active')
      .eq('organization_id', organization.id)
      .eq('is_active', true),
    supabase.from('catalog_brochures').select('id,is_active', { count: 'exact' }).eq('organization_id', organization.id),
  ]);

  if (categoriesResult.error) return <StateMessage title="Categories could not load" description={categoriesResult.error.message} tone="warning" />;
  if (productsResult.error) return <StateMessage title="Products could not load" description={productsResult.error.message} tone="warning" />;
  if (pricingRulesResult.error) return <StateMessage title="Pricing rules could not load" description={pricingRulesResult.error.message} tone="warning" />;

  const rows = ((categoriesResult.data ?? []) as CategoryRow[]).map((category) => ({
    id: category.id,
    name: category.name,
    sort_order: category.sort_order,
    is_active: category.is_active,
    parent_id: category.parent_id,
    product_count: Array.isArray(category.products) ? category.products.length : 0,
  }));
  const uncategorizedProducts = ((productsResult.data ?? []) as ProductRow[]).filter((product) => !product.category_id).length;
  const activeCount = rows.filter((category) => category.is_active !== false).length;
  const brochureCount = brochuresResult.error ? 0 : Number(brochuresResult.count ?? brochuresResult.data?.length ?? 0);

  return (
    <AdminSettingsShell active="categories" organizationName={organization.name} missingCount={rows.length === 0 || uncategorizedProducts > 0 ? 1 : 0}>
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-5 py-2.5 shadow-[0_1px_4px_rgba(15,23,42,0.05)]">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Trade Setup</p>
          <h1 className="text-base font-extrabold tracking-[-0.02em] text-slate-950">Catalog</h1>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
          <span className={`${chipClass} border-emerald-200 bg-emerald-50 text-emerald-700`}>{rows.length} categor{rows.length === 1 ? 'y' : 'ies'}</span>
          <span className={`${chipClass} border-blue-200 bg-blue-50 text-blue-700`}>{activeCount} active</span>
          <span className={`${chipClass} border-violet-200 bg-violet-50 text-violet-700`}>{brochureCount} brochure{brochureCount === 1 ? '' : 's'}</span>
          <Link href="/admin/catalog/brochures" className={`${actionClass} border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100`}>Brochures</Link>
          <Link href="/admin/catalog#catalog-add-category" className={`${actionClass} border-blue-900 bg-blue-900 text-white hover:bg-blue-950`}>+ Add category</Link>
        </div>
      </div>
      <div id="catalog-add-category" className="space-y-4 px-5 py-4 lg:px-5 lg:py-4" data-admin-v2-foundation="S24-ADMUX-24" data-admin-v2-page="catalog">
        <Link href="/admin/catalog/brochures" className="flex flex-wrap items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 p-3 transition hover:bg-violet-100">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-black text-violet-700">PDF</span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-extrabold text-violet-900">Brochures & catalogs</span>
            <span className="mt-0.5 block text-[10.5px] text-violet-700">Upload buyer-facing PDFs, map them to product families, and make them available in inquiry and lead messages.</span>
          </span>
          <span className="text-base font-bold text-violet-700" aria-hidden="true">→</span>
        </Link>
        <div className="flex gap-2.5 rounded-ctl border border-slate-200 bg-white px-3.5 py-3">
          <span aria-hidden="true" className="text-base">🔗</span>
          <div>
            <p className="text-xs font-bold text-slate-900">Why is this one admin page?</p>
            <p className="mt-1 text-[11px] leading-[1.6] text-slate-500">
              <strong>Taxonomy tab</strong> — category structure, hierarchy, active/inactive (admin-only, set-once).{' '}
              <strong>Pricing rules tab</strong> — EXW→DDP cost build-up defaults per category.{' '}
              <strong>Brochures</strong> — buyer-facing PDF catalogs used by sales.{' '}
              The daily product list lives in <strong>/products</strong> (main nav).
            </p>
          </div>
        </div>
        <CategoriesGovernanceWorkbench categories={rows} uncategorizedProducts={uncategorizedProducts} pricingRules={(pricingRulesResult.data ?? []) as PricingCalculatorDefaultRule[]} />
        <Link href="/admin/pricing" className="flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 p-3 transition hover:bg-teal-100">
          <span className="text-base" aria-hidden="true">💰</span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-extrabold text-emerald-800">Catalog ready — review pricing engine defaults</span>
            <span className="mt-0.5 block text-[10.5px] text-slate-500">Confirm approval threshold and currency settings</span>
          </span>
          <span className="text-base font-bold text-teal-700" aria-hidden="true">→</span>
        </Link>
      </div>
    </AdminSettingsShell>
  );
}
