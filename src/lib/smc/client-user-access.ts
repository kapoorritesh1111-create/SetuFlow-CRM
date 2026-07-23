import { createClient } from '@/lib/supabase/server';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

export const RITESH_SMC_USER_ID = '180afa12-6ff6-4e16-b8d1-04b13e508970';

export async function getRiteshClientUserOperator() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== RITESH_SMC_USER_ID) return null;

  const [{ data: membership }, { data: smcMember }] = await Promise.all([
    supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', INTERNAL_ORG_ID)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
    (supabase as any)
      .from('smc_team_members')
      .select('id, role, can_manage_clients, can_manage_access, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
  ]);

  if (!membership || !smcMember) return null;
  if (smcMember.role !== 'owner') return null;
  if (!smcMember.can_manage_clients || !smcMember.can_manage_access) return null;

  return { user, supabase, membership, smcMember };
}
