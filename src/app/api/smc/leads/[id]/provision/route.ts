import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';
import { provisionWorkspaceFromOnboardingRequest } from '@/features/client-onboarding/server/provisioning';

export const dynamic = 'force-dynamic';

async function assertSmcMember() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: m } = await (supabase as any)
    .from('organization_members').select('id, user_id')
    .eq('organization_id', INTERNAL_ORG_ID).eq('user_id', user.id).maybeSingle();
  return m ? { supabase, membership: m } : null;
}

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await assertSmcMember();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { supabase, membership } = ctx;
  const leadId = params.id;

  const { data: request, error: reqError } = await (supabase as any)
    .from('client_onboarding_requests').select('*').eq('id', leadId).maybeSingle();
  if (reqError || !request) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  if (request.linked_organization_id) {
    return NextResponse.json({
      error: 'This lead already has a linked workspace.',
      linked: request.linked_organization_id,
    }, { status: 409 });
  }

  const { data: platformOrg } = await (supabase as any)
    .from('organizations').select('id').eq('id', INTERNAL_ORG_ID).maybeSingle();
  if (!platformOrg) return NextResponse.json({ error: 'Platform org not found' }, { status: 500 });

  const admin = createAdminSupabaseClient();

  try {
    const result = await provisionWorkspaceFromOnboardingRequest({
      admin,
      request,
      platformOrganizationId: platformOrg.id,
      actorMembershipId: membership.id,
      actorUserId: membership.user_id ?? null,
    });

    await (admin as any).from('client_onboarding_requests').update({
      linked_organization_id: result.organizationId,
      workspace_domain: result.workspaceDomain,
      status: 'admin_invite_ready',
      updated_at: new Date().toISOString(),
    }).eq('id', leadId);

    const { data: updatedLead } = await (supabase as any)
      .from('client_onboarding_requests').select('*').eq('id', leadId).single();

    return NextResponse.json({
      success: true,
      organizationId: result.organizationId,
      workspaceDomain: result.workspaceDomain,
      message: `Workspace provisioned: ${result.workspaceDomain}. Send the first admin invite from Client Orgs.`,
      lead: updatedLead,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Provisioning failed: ${msg}` }, { status: 500 });
  }
}
