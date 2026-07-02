import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify caller is an internal org member
  const { data: membership } = await (supabase as any)
    .from('organization_members')
    .select('id')
    .eq('organization_id', INTERNAL_ORG_ID)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Fetch team from smc_team_members (new table)
  const { data: smcTeam } = await (supabase as any)
    .from('smc_team_members')
    .select('user_id, display_name, initials, email, role, allowed_groups, can_manage_leads, can_manage_clients, can_manage_access, can_view_revenue, can_view_delivery, is_active')
    .eq('is_active', true)
    .order('role', { ascending: true });

  if (smcTeam && smcTeam.length > 0) {
    return NextResponse.json({ team: smcTeam, source: 'smc_team_members', currentUserId: user.id });
  }

  // Fallback: pull from org members + profiles if smc_team_members is empty
  const { data: orgMembers } = await (supabase as any)
    .from('organization_members')
    .select('user_id, roles, profiles(full_name, username, email)')
    .eq('organization_id', INTERNAL_ORG_ID);

  const team = ((orgMembers ?? []) as any[]).map((m: any) => {
    const name = m.profiles?.full_name ?? m.profiles?.username ?? 'Team member';
    const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
    return {
      user_id: m.user_id,
      display_name: name,
      initials,
      email: m.profiles?.email ?? null,
      role: (m.roles ?? []).includes('admin') ? 'lead' : 'member',
      allowed_groups: null,
      can_manage_leads: true,
      can_manage_clients: false,
      can_manage_access: false,
      can_view_revenue: false,
      can_view_delivery: true,
      is_active: true,
    };
  });

  return NextResponse.json({ team, source: 'org_members_fallback', currentUserId: user.id });
}
