'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

type CategoryIdRow = { id: string };
type CategorySortPatch = { sort_order: number; updated_at: string };
type CategorySelectQuery = {
  eq(column: 'organization_id', value: string): { in(column: 'id', values: string[]): Promise<{ data: CategoryIdRow[] | null; error: { message: string } | null }> };
};
type CategoryUpdateQuery = {
  eq(column: 'id' | 'organization_id', value: string): CategoryUpdateQuery;
};
type CategoryTableClient = {
  select(columns: 'id'): CategorySelectQuery;
  update(payload: CategorySortPatch): CategoryUpdateQuery;
};

function categoryTable(supabase: Awaited<ReturnType<typeof createClient>>) {
  return supabase.from('product_categories') as unknown as CategoryTableClient;
}

export async function updateCategorySortOrder(ids: string[]): Promise<void> {
  const context = await requireAdminWorkspace();
  if (context.missingEnv || !context.organization) return;
  const orderedIds = ids.filter((id) => typeof id === 'string' && id.trim().length > 0);
  if (!orderedIds.length) return;

  const supabase = await createClient();
  const categories = categoryTable(supabase);
  const { data: ownedCategories, error } = await categories
    .select('id')
    .eq('organization_id', context.organization.id)
    .in('id', orderedIds);
  if (error) return;

  const ownedIds = new Set((ownedCategories ?? []).map((row) => row.id));
  await Promise.all(
    orderedIds
      .filter((id) => ownedIds.has(id))
      .map((id, index) =>
        categories
          .update({ sort_order: index + 1, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('organization_id', context.organization.id),
      ),
  );

  revalidatePath('/admin/categories');
}
