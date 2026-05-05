import { PageHeader } from '@/components/ui/page-header';
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

function noticeFor(code?: string) {
  if (code === 'category-created') return { title: 'Category created', description: 'The new category is available for products and imports.', tone: 'success' as const };
  if (code === 'category-updated') return { title: 'Category saved', description: 'Category name, parent, sort order, and active state were saved.', tone: 'success' as const };
  if (code === 'category-error') return { title: 'Category was not saved', description: 'Supabase rejected the category save. Check the category fields and try again.', tone: 'danger' as const };
  if (code === 'pricing-rule-saved') return { title: 'Category pricing rule saved', description: 'This category now has its own default pricing calculator rule.', tone: 'success' as const };
  if (code === 'pricing-rule-error') return { title: 'Pricing rule was not saved', description: 'Supabase rejected the category pricing rule save. Check values and try again.', tone: 'danger' as const };
  if (code === 'pricing-rule-category-required') return { title: 'Choose a category', description: 'Select a category before saving category pricing defaults.', tone: 'warning' as const };
  return null;
}

export default async function Page({ searchParams }: { searchParams?: { notice?: string } }) {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  const { missingEnv, membership, organization } = await requireAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  if (!membership || !organization) return null;
  const supabase = await createClient();
  const [{ data }, { data: products }, { data: pricingRules }] = await Promise.all([
    (supabase as any)
      .from('product_categories')
      .select('id, name, sort_order, is_active, parent_id, products(id)')
      .eq('organization_id', organization.id)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    (supabase as any)
      .from('products')
      .select('id, category_id')
      .eq('organization_id', organization.id),
    (supabase as any)
      .from('pricing_calculator_default_rules')
      .select('id, organization_id, rule_scope, category_id, currency, margin_mode, inland_transport_cost, export_customs_cost, port_handling_cost, freight_cost, insurance_cost, import_duty_percent, destination_charges, local_delivery_cost, internal_margin_percent, distributor_margin_percent, retail_margin_percent, is_active')
      .eq('organization_id', organization.id)
      .eq('is_active', true),
  ]);
  const rows = ((data ?? []) as CategoryRow[]).map((category) => ({
    id: category.id,
    name: category.name,
    sort_order: category.sort_order,
    is_active: category.is_active,
    parent_id: category.parent_id,
    product_count: Array.isArray(category.products) ? category.products.length : 0,
  }));
  const uncategorizedProducts = ((products ?? []) as ProductRow[]).filter((product) => !product.category_id).length;
  const notice = noticeFor(searchParams?.notice);

  return (
    <AdminSettingsShell active="categories" organizationName={organization.name} missingCount={rows.length === 0 ? 1 : 0}>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Admin & Settings"
          title="Categories"
          badge="Taxonomy"
          description="Manage category structure, hierarchy, active status, and import-ready taxonomy."
        />
        {notice ? <StateMessage title={notice.title} description={notice.description} tone={notice.tone} /> : null}
        <CategoriesGovernanceWorkbench categories={rows} uncategorizedProducts={uncategorizedProducts} pricingRules={(pricingRules ?? []) as PricingCalculatorDefaultRule[]} />
      </div>
    </AdminSettingsShell>
  );
}
