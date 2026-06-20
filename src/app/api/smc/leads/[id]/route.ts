import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

export const dynamic = 'force-dynamic';

async function assertSetuMember() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: m } = await (supabase as any).from('organization_members').select('id').eq('organization_id', INTERNAL_ORG_ID).eq('user_id', user.id).maybeSingle();
  return m ? supabase : null;
}

const ALLOWED_FIELDS = ['pipeline_stage', 'lead_score', 'internal_notes', 'next_follow_up_at', 'assigned_to_name', 'status'];

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const sb = await assertSetuMember();
  if (!sb) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) { if (key in body) patch[key] = body[key]; }
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  const { data, error } = await (sb as any).from('client_onboarding_requests').update(patch).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}
