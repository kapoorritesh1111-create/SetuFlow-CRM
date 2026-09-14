import { NextResponse, type NextRequest } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { checkRateLimit, publicRateLimitKey } from '@/lib/rate-limit/simple';
import { loadPricingContextV5 } from '@/lib/packaging-pricing-v5/repository';
import { calculateFrameFamilyPriceReviewV5 } from '@/lib/packaging-pricing-v5/frame-family-cost-core';
import type { PricingBucketV5 } from '@/lib/packaging-pricing-v5/types';
import type { FrameFamilySupplyFormV5 } from '@/lib/packaging-pricing-v5/frame-family-geometry';

export const dynamic = 'force-dynamic';

const STARK_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const ALLOWED: Record<string, FrameFamilySupplyFormV5> = {
  'stark-center-seal-roll-v5-review': 'center_seal_roll',
  'stark-center-seal-pouch-v5-review': 'center_seal_pouch',
  'stark-3ss-roll-v5-review': 'three_side_seal_roll',
  'stark-3ss-pouch-v5-review': 'three_side_seal_pouch',
};

function finite(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function POST(request: NextRequest) {
  const limit = await checkRateLimit(publicRateLimitKey('pricing-v5-frame-family-review', request), 120, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ ok: false, error: 'too_many_requests' }, { status: 429 });

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ ok: false, error: 'service_unavailable' }, { status: 503 });

  try {
    const body = await request.json().catch(() => ({}));
    const templateSlug = String(body.template_slug || '');
    const supplyForm = ALLOWED[templateSlug];
    if (!supplyForm) return NextResponse.json({ ok: false, error: 'unsupported_review_template' }, { status: 400 });

    const width = finite(body.width_mm);
    const height = finite(body.height_mm);
    const quantity = finite(body.quantity);
    const bucket = body.commercial_bucket == null || body.commercial_bucket === '' ? null : Number(body.commercial_bucket);
    if (!width || !height || !quantity || !String(body.construction_id || '')) {
      return NextResponse.json({ ok: false, error: 'width_height_quantity_and_construction_required' }, { status: 400 });
    }
    if (bucket != null && ![1,2,3,4,5].includes(bucket)) {
      return NextResponse.json({ ok: false, error: 'invalid_commercial_bucket' }, { status: 400 });
    }

    const { data: template, error } = await (admin as any)
      .from('packaging_pricing_templates')
      .select('id,slug,status,is_active,calculation_engine_key')
      .eq('organization_id', STARK_ORG_ID)
      .eq('slug', templateSlug)
      .eq('calculation_version', 5)
      .eq('calculation_engine_key', 'frame_formula_v5')
      .maybeSingle();
    if (error || !template?.id) return NextResponse.json({ ok: false, error: 'review_template_not_found' }, { status: 404 });

    const context = await loadPricingContextV5(STARK_ORG_ID, template.id, { publishedOnly: false });
    const result = calculateFrameFamilyPriceReviewV5(context, {
      supply_form: supplyForm,
      width_mm: width,
      height_mm: height,
      construction_id: String(body.construction_id),
      print: body.print === 'CMYKW' ? 'CMYKW' : 'CMYK',
      quantity: Math.floor(quantity),
      commercial_bucket: bucket as PricingBucketV5 | null,
    });

    return NextResponse.json({
      ok: true,
      review_only: true,
      activation_allowed: false,
      template: { slug: templateSlug, status: template.status, is_active: template.is_active },
      result,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[pricing-v5-frame-family-review] failed', error);
    return NextResponse.json({ ok: false, error: 'frame_family_review_unavailable' }, { status: 503 });
  }
}
