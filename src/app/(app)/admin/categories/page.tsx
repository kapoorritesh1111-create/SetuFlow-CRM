import { StateMessage } from '@/components/ui/state-message';
import { AdminPageHero, AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { CategoriesAdminWorkspace } from '@/features/admin/components/admin-reference-workspaces';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

type CategoryRow = { id: string; name: string; sort_order: number | null; is_active: boolean | null; products?: { id: string }[] | null };

export default async function Page() {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  const { missingEnv, membership, organization } = await requireAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  if (!membership || !organization) return null;
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from('product_categories')
    .select('id, name, sort_order, is_active, products(id)')
    .eq('organization_id', organization.id)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  const rows = ((data ?? []) as CategoryRow[]).map((category) => ({
    ...category,
    product_count: Array.isArray(category.products) ? category.products.length : 0,
  }));
  return <AdminSettingsShell active="categories" organizationName={organization.name} missingCount={rows.length === 0 ? 1 : 0}><AdminPageHero title="Categories" description="Manage the current catalog category list and keep quote/category routing transparent for operators." badge={organization.name} stats={[{ label: 'Categories', value: rows.length, tone: rows.length ? 'success' : 'warning' }, { label: 'Active', value: rows.filter((item) => item.is_active).length, tone: 'info' }] as any} /><CategoriesAdminWorkspace categories={rows} /></AdminSettingsShell>;
}
