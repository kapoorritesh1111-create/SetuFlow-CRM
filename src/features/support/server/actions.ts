'use server';

import { redirect } from 'next/navigation';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { persistActiveOrganization } from '@/lib/workspace/auth';

function normalizeOrganizationId(value: FormDataEntryValue | null) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > 0 ? text : null;
}

export async function switchSupportOrganization(formData: FormData): Promise<void> {
  const organizationId = normalizeOrganizationId(formData.get('organization_id'));
  if (!organizationId) redirect('/support?notice=organization-required');

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect('/login?next=/support');

  const admin = createAdminSupabaseClient();
  if (!admin) redirect('/support?notice=service-role-missing');

  const { data: supportUser } = await (admin as any)
    .from('platform_support_users')
    .select('user_id, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!supportUser?.user_id) redirect('/dashboard');

  const { data: membership } = await (admin as any)
    .from('organization_members')
    .select('id, organization_id, is_active, is_internal_support')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .eq('is_internal_support', true)
    .maybeSingle();

  if (!membership?.id) redirect('/support?notice=access-missing');

  persistActiveOrganization(organizationId, user.id);
  redirect('/dashboard');
}
