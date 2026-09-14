import { NextResponse, type NextRequest } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { checkRateLimit, publicRateLimitKey } from '@/lib/rate-limit/simple';
import { loadPricingContextV5 } from '@/lib/packaging-pricing-v5/repository';
import { calculateFrameFamilyPriceReviewV5 } from '@/lib/packaging-pricing-v5/frame-family-cost-core';
import type { PricingBucketV5 } from '@/lib/packaging-pricing-v5/types';
import type { FrameFamilySupplyFormV5 } from '@/lib/packaging-pricing-v5/frame-family-geometry';

export const dynamic = 'force-dynamic';

const STARK_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const ALLOWED: Record<string, { supplyForm: FrameFamilySupplyFormV5; baselineSlug: string; label: string }> = {
  'stark-center-seal-roll-v5-review': { supplyForm: 'center_seal_roll', baselineSlug: 'stark-center-seal-matrix-v4', label: 'Center Seal — Roll Form' },
  'stark-center-seal-pouch-v5-review': { supplyForm: 'center_seal_pouch', baselineSlug: 'stark-center-seal-matrix-v4', label: 'Center Seal — Pouch Form' },
  'stark-3ss-roll-v5-review': { supplyForm: 'three_side_seal_roll', baselineSlug: 'stark-3ss-roll-matrix-v4', label: '3 Side Seal — Roll Form' },
  'stark-3ss-pouch-v5-review': { supplyForm: 'three_side_seal_pouch', baselineSlug: 'stark-3ss-pouch-matrix-v4', label: '3 Side Seal — Pouch Form' },
};

const QTY_COLUMNS = [
  { quantity: 500, key: 'q1_rate_per_frame' },
  { quantity: 1000, key: 'q2_rate_per_frame' },
  { quantity: 2000, key: 'q3_rate_per_frame' },
  { quantity: 5000, key: 'q4_rate_per_frame' },
  { quantity: 10000, key: 'q5_rate_per_frame' },
] as const;

function finite(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizedConstruction(value: unknown) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s*[-–—]\s*(roll|pouch)\s*form\s*$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function baselineRateForQuantity(row: any, quantity: number) {
  const nearest = QTY_COLUMNS.reduce((best, item) => (
    Math.abs(item.quantity - quantity) < Math.abs(best.quantity - quantity) ? item : best
  ), QTY_COLUMNS[0]);
  const ratePerFrame = finite(row?.[nearest.key]);
  return { requested_quantity: quantity, baseline_quantity: nearest.quantity, rate_per_frame: ratePerFrame };
}

async function getTemplate(admin: any, templateSlug: string) {
  const { data: template, error } = await admin
    .from('packaging_pricing_templates')
    .select('id,slug,status,is_active,calculation_engine_key')
    .eq('organization_id', STARK_ORG_ID)
    .eq('slug', templateSlug)
    .eq('calculation_version', 5)
    .eq('calculation_engine_key', 'frame_formula_v5')
    .maybeSingle();
  if (error || !template?.id) return null;
  return template;
}

export async function GET(request: NextRequest) {
  const limit = await checkRateLimit(publicRateLimitKey('pricing-v5-frame-family-review-get', request), 120, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ ok: false, error: 'too_many_requests' }, { status: 429 });
  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ ok: false, error: 'service_unavailable' }, { status: 503 });

  try {
    const families = await Promise.all(Object.entries(ALLOWED).map(async ([templateSlug, config]) => {
      const template = await getTemplate(admin as any, templateSlug);
      if (!template) return { template_slug: templateSlug, label: config.label, available: false };
      const context = await loadPricingContextV5(STARK_ORG_ID, template.id, { publishedOnly: false });
      const { data: baselineTemplate } = await (admin as any)
        .from('packaging_pricing_templates')
        .select('id')
        .eq('organization_id', STARK_ORG_ID)
        .eq('slug', config.baselineSlug)
        .maybeSingle();
      const { data: rows } = baselineTemplate?.id
        ? await (admin as any)
            .from('packaging_pricing_matrix_rows')
            .select('width_mm,height_mm,construction_key,supply_form')
            .eq('organization_id', STARK_ORG_ID)
            .eq('template_id', baselineTemplate.id)
        : { data: [] } as any;
      const formNeedle = config.supplyForm.includes('roll') ? 'roll' : 'pouch';
      const filteredRows = (rows ?? []).filter((row: any) => String(row.supply_form ?? row.construction_key ?? '').toLowerCase().includes(formNeedle));
      const sizeMap = new Map<string, { width_mm: number; height_mm: number }>();
      filteredRows.forEach((row: any) => {
        const width = Number(row.width_mm); const height = Number(row.height_mm);
        if (width > 0 && height > 0) sizeMap.set(`${width}x${height}`, { width_mm: width, height_mm: height });
      });
      return {
        template_slug: templateSlug,
        label: config.label,
        available: true,
        review_only: true,
        baseline_slug: config.baselineSlug,
        constructions: context.constructions.map((c: any) => ({ id: c.id, name: c.name, construction_key: c.construction_key, layer_count: c.layer_count })),
        sizes: [...sizeMap.values()].sort((a, b) => a.width_mm - b.width_mm || a.height_mm - b.height_mm),
      };
    }));
    return NextResponse.json({ ok: true, review_only: true, activation_allowed: false, families }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[pricing-v5-frame-family-review] GET failed', error);
    return NextResponse.json({ ok: false, error: 'frame_family_review_unavailable' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const limit = await checkRateLimit(publicRateLimitKey('pricing-v5-frame-family-review', request), 120, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ ok: false, error: 'too_many_requests' }, { status: 429 });

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ ok: false, error: 'service_unavailable' }, { status: 503 });

  try {
    const body = await request.json().catch(() => ({}));
    const templateSlug = String(body.template_slug || '');
    const config = ALLOWED[templateSlug];
    if (!config) return NextResponse.json({ ok: false, error: 'unsupported_review_template' }, { status: 400 });

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

    const template = await getTemplate(admin as any, templateSlug);
    if (!template) return NextResponse.json({ ok: false, error: 'review_template_not_found' }, { status: 404 });

    const context = await loadPricingContextV5(STARK_ORG_ID, template.id, { publishedOnly: false });
    const selectedConstruction = context.constructions.find((c: any) => String(c.id) === String(body.construction_id));
    const result = calculateFrameFamilyPriceReviewV5(context, {
      supply_form: config.supplyForm,
      width_mm: width,
      height_mm: height,
      construction_id: String(body.construction_id),
      print: body.print === 'CMYKW' ? 'CMYKW' : 'CMYK',
      quantity: Math.floor(quantity),
      commercial_bucket: bucket as PricingBucketV5 | null,
    });

    const { data: baselineTemplate } = await (admin as any)
      .from('packaging_pricing_templates')
      .select('id')
      .eq('organization_id', STARK_ORG_ID)
      .eq('slug', config.baselineSlug)
      .maybeSingle();
    const formNeedle = config.supplyForm.includes('roll') ? 'roll' : 'pouch';
    let baselineRow: any = null;
    if (baselineTemplate?.id) {
      const { data: candidates } = await (admin as any)
        .from('packaging_pricing_matrix_rows')
        .select('width_mm,height_mm,construction_key,supply_form,q1_rate_per_frame,q2_rate_per_frame,q3_rate_per_frame,q4_rate_per_frame,q5_rate_per_frame')
        .eq('organization_id', STARK_ORG_ID)
        .eq('template_id', baselineTemplate.id)
        .eq('width_mm', width)
        .eq('height_mm', height);
      const targetKey = normalizedConstruction(selectedConstruction?.construction_key || selectedConstruction?.name);
      baselineRow = (candidates ?? []).find((row: any) => {
        const form = String(row.supply_form ?? row.construction_key ?? '').toLowerCase();
        return form.includes(formNeedle) && normalizedConstruction(row.construction_key) === targetKey;
      }) ?? (candidates ?? []).find((row: any) => String(row.supply_form ?? row.construction_key ?? '').toLowerCase().includes(formNeedle)) ?? null;
    }

    const baselineRate = baselineRateForQuantity(baselineRow, Math.floor(quantity));
    const unitsPerFrame = Number(result.geometry?.units_per_frame || 0);
    const baselineUnitPrice = baselineRate.rate_per_frame != null && unitsPerFrame > 0 ? baselineRate.rate_per_frame / unitsPerFrame : null;
    const v5UnitPrice = finite(result.selling_price?.unit_price);
    const delta = baselineUnitPrice != null && v5UnitPrice != null ? v5UnitPrice - baselineUnitPrice : null;
    const deltaPct = delta != null && baselineUnitPrice ? (delta / baselineUnitPrice) * 100 : null;

    return NextResponse.json({
      ok: true,
      review_only: true,
      activation_allowed: false,
      template: { slug: templateSlug, status: template.status, is_active: template.is_active },
      comparison: {
        family_label: config.label,
        baseline_slug: config.baselineSlug,
        baseline_found: Boolean(baselineRow && baselineRate.rate_per_frame != null),
        construction: selectedConstruction ? { id: selectedConstruction.id, name: selectedConstruction.name, construction_key: selectedConstruction.construction_key } : null,
        size: { width_mm: width, height_mm: height },
        quantity: Math.floor(quantity),
        baseline_quantity: baselineRate.baseline_quantity,
        v4_rate_per_frame: baselineRate.rate_per_frame,
        v4_unit_price: baselineUnitPrice,
        v5_unit_price: v5UnitPrice,
        difference_per_unit: delta,
        difference_pct: deltaPct,
      },
      result,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[pricing-v5-frame-family-review] failed', error);
    return NextResponse.json({ ok: false, error: 'frame_family_review_unavailable' }, { status: 503 });
  }
}
