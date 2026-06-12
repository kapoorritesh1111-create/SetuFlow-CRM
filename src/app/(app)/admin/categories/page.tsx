import Link from 'next/link';
import { StateMessage } from '@/components/ui/state-message';
import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
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

type CatalogCategory = {
  id: string;
  name: string;
  sort_order: number | null;
  is_active: boolean | null;
  parent_id: string | null;
  product_count: number;
};

const chipClass = 'rounded-full border px-2.5 py-1 text-[10px] font-bold';
const actionClass = 'rounded-lg border px-3 py-1.5 text-[11px] font-bold transition';

function parentLabel(category: CatalogCategory, categories: CatalogCategory[]) {
  return categories.find((item) => item.id === category.parent_id)?.name ?? 'None';
}

function CatalogCommandPage({ categories, uncategorizedProducts, pricingRules }: { categories: CatalogCategory[]; uncategorizedProducts: number; pricingRules: PricingCalculatorDefaultRule[] }) {
  const activeCategories = categories.filter((category) => category.is_active !== false).length;

  return (
    <>
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-5 py-2.5 shadow-[0_1px_4px_rgba(15,23,42,0.05)]">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Trade Setup</p>
          <h1 className="text-base font-extrabold tracking-[-0.02em] text-slate-950">Catalog</h1>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
          <span className={`${chipClass} border-emerald-200 bg-emerald-50 text-emerald-700`}>{categories.length} categor{categories.length === 1 ? 'y' : 'ies'}</span>
          <span className={`${chipClass} border-teal-200 bg-teal-50 text-teal-700`}>merged</span>
          <Link href="/admin/product-management#add-category" className={`${actionClass} border-blue-900 bg-blue-900 text-white hover:bg-blue-950`}>+ Add category</Link>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4 lg:px-5 lg:py-4" data-admin-v2-foundation="S24-ADMUX-24" data-admin-v2-page="catalog">
        <section className="rounded-[13px] border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex gap-3 text-xs leading-5 text-slate-600">
            <span className="text-sm" aria-hidden="true">🔗</span>
            <div>
              <p className="font-extrabold text-slate-950">Why is this one admin page?</p>
              <p><strong>Taxonomy tab</strong> — category structure, hierarchy, active/inactive status.</p>
              <p><strong>Pricing rules tab</strong> — EXW→DDP defaults per category. Daily product editing stays in <strong>/products</strong>.</p>
            </div>
          </div>
        </section>

        <div className="flex overflow-x-auto border-b border-slate-200">
          <button className="border-b-[2.5px] border-blue-900 px-4 py-2.5 text-xs font-extrabold text-blue-900">Taxonomy ({categories.length})</button>
          <button className="border-b-[2.5px] border-transparent px-4 py-2.5 text-xs font-semibold text-slate-500">Pricing rules ({pricingRules.length})</button>
        </div>

        <section className="overflow-hidden rounded-[13px] border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[8.5px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Category structure · free-text names</p>
              <h2 className="text-sm font-extrabold text-slate-950">Product taxonomy</h2>
            </div>
            <span className={`${chipClass} border-blue-200 bg-blue-50 text-blue-700`}>{activeCategories} active</span>
            <Link href="/admin/product-management#add-category" className={`${actionClass} border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100`}>+ Add category</Link>
          </div>
          <div className="divide-y divide-slate-50 px-4 py-3">
            {categories.map((category, index) => (
              <div key={category.id} className="flex items-center gap-3 py-3 text-xs">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm" aria-hidden="true">📦</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold text-slate-950">{category.name}</span>
                  <span className="mt-0.5 block text-[10px] text-slate-400">{category.product_count} product{category.product_count === 1 ? '' : 's'} · Sort: {category.sort_order ?? index + 1}</span>
                </span>
                <span className="hidden min-w-[160px] text-[10.5px] text-slate-500 md:inline">Parent: {parentLabel(category, categories)}</span>
                <span className={`${chipClass} ${category.is_active === false ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{category.is_active === false ? 'Inactive' : 'Active'}</span>
                <Link href={`/admin/product-management#category-${category.id}`} className="text-[10px] font-semibold text-slate-500 hover:text-teal-700">Edit</Link>
                <span className="text-slate-300" aria-hidden="true">▾</span>
              </div>
            ))}
            {categories.length === 0 ? <p className="py-4 text-xs text-slate-500">No categories configured yet.</p> : null}
          </div>
          <div className="flex justify-end border-t border-slate-100 px-4 py-3">
            <Link href="/admin/product-management#add-category" className={`${actionClass} border-blue-900 bg-blue-900 text-white hover:bg-blue-950`}>+ Add category</Link>
          </div>
        </section>

        {uncategorizedProducts > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">⚠ {uncategorizedProducts} product{uncategorizedProducts === 1 ? '' : 's'} need category assignment.</div>
        ) : null}

        <Link href="/admin/pricing" className="flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 p-3 transition hover:bg-teal-100">
          <span className="text-base" aria-hidden="true">💰</span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-extrabold text-emerald-800">Catalog ready — review pricing engine defaults</span>
            <span className="mt-0.5 block text-[10.5px] text-slate-500">Confirm approval threshold and currency settings</span>
          </span>
          <span className="text-base font-bold text-teal-700" aria-hidden="true">→</span>
        </Link>
      </div>
    </>
  );
}

export default async function Page() {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  const { missingEnv, membership, organization } = await requireAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  if (!membership || !organization) return null;

  const supabase = await createClient();
  const [categoriesResult, productsResult, pricingRulesResult] = await Promise.all([
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

  return (
    <AdminSettingsShell active="categories" organizationName={organization.name} missingCount={rows.length === 0 || uncategorizedProducts > 0 ? 1 : 0}>
      <CatalogCommandPage categories={rows} uncategorizedProducts={uncategorizedProducts} pricingRules={(pricingRulesResult.data ?? []) as PricingCalculatorDefaultRule[]} />
    </AdminSettingsShell>
  );
}
