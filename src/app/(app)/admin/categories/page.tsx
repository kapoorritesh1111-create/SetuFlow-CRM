import { PageHeader } from '@/components/ui/page-header';
import { StateMessage } from '@/components/ui/state-message';
import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { CategoriesGovernanceWorkbench } from '@/features/admin/components/categories-governance-workbench';
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

export default async function Page() {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  const { missingEnv, membership, organization } = await requireAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  if (!membership || !organization) return null;
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from('product_categories')
    .select('id, name, sort_order, is_active, parent_id, products(id)')
    .eq('organization_id', organization.id)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  const rows = ((data ?? []) as CategoryRow[]).map((category) => ({
    id: category.id,
    name: category.name,
    sort_order: category.sort_order,
    is_active: category.is_active,
    parent_id: category.parent_id,
    product_count: Array.isArray(category.products) ? category.products.length : 0,
  }));

  return (
    <AdminSettingsShell active="categories" organizationName={organization.name} missingCount={rows.length === 0 ? 1 : 0}>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Admin & Settings"
          title="Categories"
          badge="Taxonomy"
          description="Manage category structure, hierarchy, active status, and import-ready taxonomy."
        />
        <CategoriesGovernanceWorkbench categories={rows} />
      </div>
    </AdminSettingsShell>
  );
}
