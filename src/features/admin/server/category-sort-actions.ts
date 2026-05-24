'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

export async function updateCategorySortOrder(ids: string[]): Promise<void> {
  const context = await requireAdminWorkspace();
  if (context.missingEnv || !context.organization) return;
  const orderedIds = ids.filter((id) => typeof id === 'string' && id.trim().length > 0);
  if (!orderedIds.length) return;

  const supabase = await createClient();
  const { data: ownedCategories, error } = await supabase
    .from('product_categories')
    .select('id')
    .eq('organization_id', context.organization.id)
    .in('id', orderedIds);
  if (error) return;

  const ownedIds = new Set((ownedCategories ?? []).map((row) => row.id));
  await Promise.all(
    orderedIds
      .filter((id) => ownedIds.has(id))
      .map((id, index) =>
        supabase
          .from('product_categories')
          .update({ sort_order: index + 1, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('organization_id', context.organization.id),
      ),
  );

  revalidatePath('/admin/categories');
}
