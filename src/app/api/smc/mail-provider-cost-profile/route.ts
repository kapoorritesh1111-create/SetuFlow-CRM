import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { createClient } from '@/lib/supabase/server';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

export const dynamic = 'force-dynamic';

const PROVIDERS = new Set(['resend', 'cloudmersive']);

function errorJson(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function requireSetuOperator() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, response: errorJson('Login required', 401) };

  const { data: membership, error } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', INTERNAL_ORG_ID)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error || !membership) return { user: null, response: errorJson('SETU Mission Control access required', 403) };
  return { user, response: null };
}

export async function PATCH(request: Request) {
  const { user, response } = await requireSetuOperator();
  if (response) return response;

  const body = await request.json().catch(() => null) as { provider?: unknown; planKey?: unknown } | null;
  const provider = typeof body?.provider === 'string' ? body.provider.trim().toLowerCase() : '';
  const planKey = typeof body?.planKey === 'string' ? body.planKey.trim().toLowerCase() : '';
  if (!PROVIDERS.has(provider) || !planKey) return errorJson('Valid provider and planKey are required.');

  const admin = createServiceRoleClient() as any;
  if (!admin) return errorJson('Service role client is not configured.', 500);

  const [{ data: selected, error: selectedError }, { data: before }] = await Promise.all([
    admin.from('mail_provider_cost_catalog').select('*').eq('provider', provider).eq('plan_key', planKey).maybeSingle(),
    admin.from('mail_provider_cost_settings').select('provider,active_plan_key').eq('provider', provider).maybeSingle(),
  ]);
  if (selectedError) return errorJson(selectedError.message, 500);
  if (!selected) return errorJson('Provider plan is not in the approved cost catalog.', 404);

  const { error } = await admin.from('mail_provider_cost_settings').upsert({
    provider,
    active_plan_key: planKey,
    updated_by: user!.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'provider' });
  if (error) return errorJson(error.message, 500);

  await admin.from('audit_logs').insert({
    organization_id: INTERNAL_ORG_ID,
    actor_user_id: user!.id,
    entity_type: 'mail_provider_cost_profile',
    entity_id: null,
    action: 'smc_mail_provider_cost_profile_updated',
    payload: {
      provider,
      before: before?.active_plan_key ?? null,
      after: planKey,
      source: 'smc_mail_usage',
    },
  });

  return NextResponse.json({ ok: true, provider, activePlanKey: planKey, profile: selected });
}
