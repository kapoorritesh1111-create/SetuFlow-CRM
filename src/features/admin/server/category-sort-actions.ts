'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

export async function updateCategorySortOrder(ids: string[]): Promise<void> {
  const context = await requireAdminWorkspace();
  if (context.missingEnv || !context.organization) return;
  const organizationId = context.organization.id;
  const orderedIds = ids.filter((id) => typeof id === 'string' && id.trim().length > 0);
  if (!orderedIds.length) return;

  const supabase = await createClient();

  // Verify ownership first
  const { data: owned } = await supabase
    .from('product_categories')
    .select('id')
    .eq('organization_id', organizationId)
    .in('id', orderedIds);

  const ownedSet = new Set((owned ?? []).map((r: { id: string }) => r.id));

  // Apply sort_order updates sequentially to avoid TypeScript inference issues
  await Promise.all(
    orderedIds
      .filter((id) => ownedSet.has(id))
      .map((id, index) =>
        (supabase as any)
          .from('product_categories')
          .update({ sort_order: index + 1, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('organization_id', organizationId)
      )
  );

  revalidatePath('/admin/categories');
}
