import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export async function resolvePlatformSupportLoginTarget(email: string, requestedNext: string) {
  if (requestedNext !== '/dashboard' && requestedNext !== '/') return requestedNext;
  const admin = createAdminSupabaseClient();
  if (!admin) return requestedNext;

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .limit(1)
    .maybeSingle();

  const userId = String(profile?.id ?? '').trim();
  if (!userId) return requestedNext;

  const { data: supportUser } = await (admin as any)
    .from('platform_support_users')
    .select('user_id, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  return supportUser?.user_id ? '/support' : requestedNext;
}
