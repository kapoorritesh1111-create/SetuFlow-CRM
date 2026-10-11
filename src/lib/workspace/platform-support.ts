import { createAdminSupabaseClient } from '@/lib/supabase/admin';

/** Platform privileges are assigned explicitly by the platform registry.
 * Names, emails and tenant owner roles are never sufficient.
 */
export async function isVerifiedPlatformSupport(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const admin = createAdminSupabaseClient();
  if (!admin) return false;
  const { data, error } = await (admin as any)
    .from('platform_support_users')
    .select('user_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  return !error && data?.user_id === userId;
}
