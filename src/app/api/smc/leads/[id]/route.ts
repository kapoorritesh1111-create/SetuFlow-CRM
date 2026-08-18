import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

export const dynamic = 'force-dynamic';

async function assertSetuMember() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: m } = await (supabase as any)
    .from('organization_members')
    .select('id')
    .eq('organization_id', INTERNAL_ORG_ID)
    .eq('user_id', user.id)
    .maybeSingle();
  return m ? supabase : null;
}

const ALLOWED_FIELDS = [
  'pipeline_stage', 'lead_score', 'internal_notes', 'next_follow_up_at',
  'assigned_to_name', 'assigned_to_user_id', 'status', 'last_contact_at',
  'is_trial_request',
  // Contact info — editable from SMC drawer
  'primary_admin_name', 'primary_admin_email', 'primary_phone',
  'headquarters_country', 'website', 'industry', 'company_name',
  // Growth prospect enrichment
  'lead_origin', 'contact_title', 'linkedin_url', 'employee_size_signal',
  'evidence_urls', 'fit_reasons', 'pain_signals', 'outreach_status',
  'research_notes', 'research_last_verified_at', 'source', 'source_detail',
  // Demo tracking
  'demo_scheduled_at', 'demo_completed_at', 'demo_outcome', 'demo_notes',
];

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const sb = await assertSetuMember();
  if (!sb) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) patch[key] = body[key];
  }

  // Activity log append — never overwrite, always append
  if (body._activity) {
    const entry = {
      id: crypto.randomUUID(),
      kind: body._activity.kind ?? 'note',
      note: body._activity.note ?? '',
      actor_name: body._activity.actor_name ?? 'Team',
      actor_user_id: body._activity.actor_user_id ?? null,
      created_at: new Date().toISOString(),
    };
    const { data: existing } = await (sb as any)
      .from('client_onboarding_requests')
      .select('activity_log')
      .eq('id', params.id)
      .single();
    const currentLog: unknown[] = Array.isArray(existing?.activity_log) ? existing.activity_log : [];
    patch.activity_log = [...currentLog, entry];
    if (['call', 'email', 'whatsapp', 'demo_completed'].includes(entry.kind)) {
      patch.last_contact_at = entry.created_at;
    }
  }

  if (!Object.keys(patch).length) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

  patch.updated_at = new Date().toISOString();

  const { data, error } = await (sb as any)
    .from('client_onboarding_requests')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}
