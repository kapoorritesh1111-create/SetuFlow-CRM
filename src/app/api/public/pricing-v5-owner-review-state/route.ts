import { NextResponse, type NextRequest } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { checkRateLimit, publicRateLimitKey } from '@/lib/rate-limit/simple';

export const dynamic = 'force-dynamic';
const STARK_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const DECISIONS = new Set(['pending','approved','needs_change','answered']);

function cleanText(value: unknown, max = 5000) {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t ? t.slice(0, max) : null;
}

export async function GET(request: NextRequest) {
  const limit = await checkRateLimit(publicRateLimitKey('pricing-v5-owner-review-state-get', request), 240, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ ok:false, error:'too_many_requests' }, { status:429 });
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
  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ ok:false, error:'service_unavailable' }, { status:503 });
  const body = await request.json().catch(() => ({}));
  const reviewKey = cleanText(body.review_key, 160);
  const decision = cleanText(body.decision, 30) || 'pending';
  if (!reviewKey) return NextResponse.json({ ok:false, error:'review_key_required' }, { status:400 });
  if (!DECISIONS.has(decision)) return NextResponse.json({ ok:false, error:'invalid_decision' }, { status:400 });
  const valueJson = body.value_json && typeof body.value_json === 'object' && !Array.isArray(body.value_json) ? body.value_json : {};
  const reviewerName = cleanText(body.reviewer_name, 120) || 'Stark Packmate Owner';
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
