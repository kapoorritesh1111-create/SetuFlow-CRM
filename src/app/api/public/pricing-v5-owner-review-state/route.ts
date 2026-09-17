import { NextResponse, type NextRequest } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit, publicRateLimitKey } from '@/lib/rate-limit/simple';

export const dynamic = 'force-dynamic';
const STARK_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const DECISIONS = new Set(['pending','approved','needs_change','answered']);
const REVIEW_ROLES = new Set(['owner','admin','manager']);

function cleanText(value: unknown, max = 5000) {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t ? t.slice(0, max) : null;
}

async function requireReviewerAccess() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { ok: false as const, status: 401, error: 'authentication_required' };

  const { data: isPlatformAdmin } = await (supabase as any).rpc('is_setu_platform_admin');
  if (isPlatformAdmin === true) return { ok: true as const, user };

  const admin = createAdminSupabaseClient();
  if (!admin) return { ok: false as const, status: 503, error: 'service_unavailable' };

  const { data: member } = await (admin as any)
    .from('organization_members')
    .select('id,is_active')
    .eq('organization_id', STARK_ORG_ID)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();
  if (!member?.id) return { ok: false as const, status: 403, error: 'review_access_required' };

  const { data: userRoles } = await (admin as any)
    .from('user_roles')
    .select('role_id')
    .eq('organization_member_id', member.id);
  const roleIds = (userRoles ?? []).map((row: any) => row.role_id).filter(Boolean);
  if (!roleIds.length) return { ok: false as const, status: 403, error: 'review_access_required' };

  const { data: roles } = await (admin as any)
    .from('roles')
    .select('name')
    .in('id', roleIds);
  const canReview = (roles ?? []).some((row: any) => REVIEW_ROLES.has(String(row.name || '').toLowerCase()));
  if (!canReview) return { ok: false as const, status: 403, error: 'review_access_required' };

  return { ok: true as const, user };
}

export async function GET(request: NextRequest) {
  const limit = await checkRateLimit(publicRateLimitKey('pricing-v5-owner-review-state-get', request), 240, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ ok:false, error:'too_many_requests' }, { status:429 });

  const access = await requireReviewerAccess();
  if (!access.ok) return NextResponse.json({ ok:false, error:access.error }, { status:access.status });

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ ok:false, error:'service_unavailable' }, { status:503 });
  const { data, error } = await (admin as any)
    .from('pricing_v5_owner_review_state')
    .select('review_key,decision,value_json,reviewer_name,reviewed_at,updated_at')
    .eq('organization_id', STARK_ORG_ID)
    .order('review_key');
  if (error) return NextResponse.json({ ok:false, error:'review_state_unavailable' }, { status:500 });
  return NextResponse.json({ ok:true, organization_id:STARK_ORG_ID, items:data || [] }, { headers:{'Cache-Control':'private, no-store'} });
}

export async function POST(request: NextRequest) {
  const limit = await checkRateLimit(publicRateLimitKey('pricing-v5-owner-review-state-post', request), 240, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ ok:false, error:'too_many_requests' }, { status:429 });

  const access = await requireReviewerAccess();
  if (!access.ok) return NextResponse.json({ ok:false, error:access.error }, { status:access.status });

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ ok:false, error:'service_unavailable' }, { status:503 });
  const body = await request.json().catch(() => ({}));
  const reviewKey = cleanText(body.review_key, 160);
  const decision = cleanText(body.decision, 30) || 'pending';
  if (!reviewKey) return NextResponse.json({ ok:false, error:'review_key_required' }, { status:400 });
  if (!DECISIONS.has(decision)) return NextResponse.json({ ok:false, error:'invalid_decision' }, { status:400 });
  const valueJson = body.value_json && typeof body.value_json === 'object' && !Array.isArray(body.value_json) ? body.value_json : {};
  const reviewerName = access.user.email || 'Authorized reviewer';
  const now = new Date().toISOString();
  const { data, error } = await (admin as any)
    .from('pricing_v5_owner_review_state')
    .upsert({
      organization_id:STARK_ORG_ID,
      review_key:reviewKey,
      decision,
      value_json:valueJson,
      reviewer_name:reviewerName,
      reviewed_at:decision === 'pending' ? null : now,
      updated_at:now,
    }, { onConflict:'organization_id,review_key' })
    .select('review_key,decision,value_json,reviewer_name,reviewed_at,updated_at')
    .single();
  if (error) return NextResponse.json({ ok:false, error:'review_state_save_failed' }, { status:500 });
  return NextResponse.json({ ok:true, item:data });
}