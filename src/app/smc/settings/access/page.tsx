import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';
import { AccessBoard } from './access-board';

export const dynamic = 'force-dynamic';

type SmcMember = {
  id: string; user_id: string; display_name: string; initials: string;
  email: string | null; role: string; allowed_groups: string[] | null;
  can_manage_leads: boolean; can_manage_clients: boolean;
  can_manage_access: boolean; can_view_revenue: boolean;
  can_view_delivery: boolean; is_active: boolean;
};

async function assertOwner() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/');
  const { data: m } = await (sb as any)
    .from('smc_team_members')
    .select('role, can_manage_access')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();
  if (!m || (!m.can_manage_access && m.role !== 'owner')) redirect('/smc/settings');
  return { sb, userId: user.id };
}

async function saveMemberAction(formData: FormData) {
  'use server';
  const { sb } = await assertOwner();
  const userId = String(formData.get('user_id') ?? '').trim();
  const displayName = String(formData.get('display_name') ?? '').trim();
  const initials = String(formData.get('initials') ?? '').trim().slice(0, 3).toUpperCase();
  const email = String(formData.get('email') ?? '').trim() || null;
  const role = String(formData.get('role') ?? 'member');
  const groupsRaw = String(formData.get('allowed_groups') ?? '').trim();
  const allowedGroups = groupsRaw ? groupsRaw.split(',').map(g => g.trim()).filter(Boolean) : null;

  if (!userId || !displayName) return;

  const payload = {
    user_id: userId, display_name: displayName, initials: initials || displayName.slice(0, 2).toUpperCase(),
    email, role,
    allowed_groups: allowedGroups,
    can_manage_leads: formData.get('can_manage_leads') === 'on',
    can_manage_clients: formData.get('can_manage_clients') === 'on',
    can_manage_access: formData.get('can_manage_access') === 'on',
    can_view_revenue: formData.get('can_view_revenue') === 'on',
    can_view_delivery: formData.get('can_view_delivery') === 'on',
    is_active: formData.get('is_active') !== 'off',
    updated_at: new Date().toISOString(),
  };

  const id = String(formData.get('id') ?? '').trim();
  if (id) {
    await (sb as any).from('smc_team_members').update(payload).eq('id', id);
  } else {
    await (sb as any).from('smc_team_members').insert(payload);
  }
  revalidatePath('/smc/settings/access');
  redirect('/smc/settings/access?notice=saved');
}

async function deactivateMemberAction(formData: FormData) {
  'use server';
  const { sb, userId: callerId } = await assertOwner();
  const id = String(formData.get('id') ?? '').trim();
  const targetUserId = String(formData.get('user_id') ?? '').trim();
  if (!id || targetUserId === callerId) return; // can't deactivate yourself
  await (sb as any).from('smc_team_members').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/smc/settings/access');
  redirect('/smc/settings/access?notice=deactivated');
}

export default async function SmcAccessPage({ searchParams }: { searchParams?: Record<string, string> }) {
  const { sb } = await assertOwner();
  const params = await searchParams;
  const notice = params?.notice;

  const { data } = await (sb as any)
    .from('smc_team_members')
    .select('*')
    .order('role', { ascending: true })
    .order('display_name', { ascending: true });

  const members = (data ?? []) as SmcMember[];
  return <AccessBoard members={members} notice={notice ?? null} saveMember={saveMemberAction} deactivateMember={deactivateMemberAction} />;
}
