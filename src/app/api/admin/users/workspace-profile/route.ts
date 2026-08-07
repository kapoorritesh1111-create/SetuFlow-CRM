import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireAdminWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

function cleanName(value: unknown) {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  return text.length > 0 ? text.slice(0, 120) : null;
}

export async function GET() {
  const context = await requireAdminWorkspace();
  if (!context.user || !context.organization) {
    return NextResponse.json({ error: 'Workspace access required.' }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: 'Admin client unavailable.' }, { status: 500 });

  const { data, error } = await (admin as any)
    .from('organization_members')
    .select('id, display_name')
    .eq('organization_id', context.organization.id)
    .eq('is_internal_support', false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ memberships: data ?? [] });
}

export async function POST(request: Request) {
  const context = await requireAdminWorkspace();
  if (!context.user || !context.organization || !context.membership) {
    return NextResponse.json({ error: 'Workspace access required.' }, { status: 401 });
  }

  if (!context.currentRoles.includes('owner') && !context.currentRoles.includes('admin')) {
    return NextResponse.json({ error: 'Owner or admin access required.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { membership_id?: unknown; display_name?: unknown } | null;
  const membershipId = typeof body?.membership_id === 'string' ? body.membership_id.trim() : '';
  const displayName = cleanName(body?.display_name);
  if (!membershipId) return NextResponse.json({ error: 'membership_id is required.' }, { status: 400 });

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: 'Admin client unavailable.' }, { status: 500 });

  const { data: target, error: targetError } = await (admin as any)
    .from('organization_members')
    .select('id, organization_id, user_id, is_internal_support, display_name')
    .eq('id', membershipId)
    .eq('organization_id', context.organization.id)
    .maybeSingle();

  if (targetError || !target || target.is_internal_support) {
    return NextResponse.json({ error: 'User is not available in this organization.' }, { status: 404 });
  }

  const { error } = await (admin as any)
    .from('organization_members')
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq('id', membershipId)
    .eq('organization_id', context.organization.id)
    .eq('is_internal_support', false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await (admin as any).from('audit_logs').insert({
    organization_id: context.organization.id,
    actor_user_id: context.membership.user_id ?? context.user.id,
    action: 'member_workspace_identity_updated',
    entity_type: 'organization_member',
    entity_id: membershipId,
    payload: {
      previous: { display_name: target.display_name ?? null },
      next: { display_name: displayName },
      scope: 'organization_membership',
    },
  });

  return NextResponse.json({ ok: true, display_name: displayName });
}
