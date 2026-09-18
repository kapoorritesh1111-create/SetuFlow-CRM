import { NextResponse, type NextRequest } from 'next/server';
import { checkRateLimit, publicRateLimitKey } from '@/lib/rate-limit/simple';
import { loadPricingContextV5 } from '@/lib/packaging-pricing-v5/repository';
import { calculatePackagingPriceV5, toSalesPricingResultV5 } from '@/lib/packaging-pricing-v5/engine-registry';
import type { BottomPrintModeV5, PricingContextV5 } from '@/lib/packaging-pricing-v5/types';

export const dynamic = 'force-dynamic';

const STARK_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const TEMPLATE_ID = '5635e709-213d-4fb6-a9f8-2467021a4c64';
const REVIEW_QUANTITIES = [5000, 10000, 15000, 20000] as const;

type ReviewBody = {
  size_profile_id?: unknown;
  construction_id?: unknown;
  quantity?: unknown;
  print?: unknown;
  selected_charge_codes?: unknown;
  bottom_print_mode?: unknown;
  route_override?: unknown;
  matrix?: unknown;
  rate_override?: unknown;
};

async function context(): Promise<PricingContextV5> {
  return loadPricingContextV5(STARK_ORG_ID, TEMPLATE_ID, { publishedOnly: true });
}

function safeCatalog(ctx: PricingContextV5) {
  return {
    template: { id: ctx.template.id, name: ctx.template.name, currency: ctx.template.currency, status: ctx.template.status },
    sizes: ctx.sizeProfiles.filter((s) => s.is_active && s.is_quoteable).map((s) => ({
      id: s.id, key: s.size_key, name: s.name, width_mm: s.width_mm, height_mm: s.height_mm,
      bottom_gusset_each_mm: s.bottom_gusset_each_mm, pricing_bucket: s.pricing_bucket,
      route: s.gusset_production_mode, bottom_registration_mode: s.bottom_registration_mode, sort_order: s.sort_order,
    })),
    constructions: ctx.constructions.filter((c) => c.is_active && c.is_quoteable).map((c) => ({
      id: c.id, key: c.construction_key, family_key: c.construction_family_key, name: c.name,
      layer_count: c.layer_count, finish_type: c.finish_type, barrier_type: c.barrier_type, sort_order: c.sort_order,
    })),
    charges: (ctx.charges ?? []).filter((c) => c.current_rate != null).map((c) => ({ code: c.code, name: c.name, category: c.category })),
    review_quantities: REVIEW_QUANTITIES,
  };
}

function mode(value: unknown): BottomPrintModeV5 | undefined {
  return value === 'solid_unregistered' || value === 'registered_artwork' ? value : undefined;
}

function chargeCodes(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === 'string').slice(0, 20);
}

function contextWithRateOverride(ctx: PricingContextV5, value: unknown): PricingContextV5 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ctx;
  const input = value as Record<string, unknown>;
  const kind = input.kind === 'charge' ? 'charge' : input.kind === 'cost' ? 'cost' : null;
  const itemId = typeof input.item_id === 'string' ? input.item_id : '';
  const proposed = Number(input.proposed_rate);
  if (!kind || !itemId || !Number.isFinite(proposed) || proposed < 0 || proposed > 10000000) return ctx;
  if (kind === 'cost') {
    return { ...ctx, masters: ctx.masters.map((item) => item.id === itemId ? { ...item, current_rate: proposed } : item) };
  }
  return { ...ctx, charges: (ctx.charges ?? []).map((item) => item.id === itemId ? { ...item, current_rate: proposed } : item) };
}

function contextWithRouteOverride(ctx: PricingContextV5, sizeId: string, override: unknown): PricingContextV5 {
  const route = override === 'separate' || override === 'integrated' || override === 'conditional' ? override : null;
  if (!route) return ctx;
  return {
    ...ctx,
    sizeProfiles: ctx.sizeProfiles.map((size) => size.id === sizeId ? { ...size, gusset_production_mode: route } : size),
  };
}

function pricingInput(ctx: PricingContextV5, body: ReviewBody, sizeId: string, constructionId: string, quantity: number) {
  const size = ctx.sizeProfiles.find((s) => s.id === sizeId);
  const requested = mode(body.bottom_print_mode);
  const bottom_print_mode: BottomPrintModeV5 | undefined = requested ?? (size?.gusset_production_mode === 'conditional' ? 'solid_unregistered' : undefined);
  return {
    size_profile_id: sizeId,
    construction_id: constructionId,
    print: body.print === 'CMYK' ? 'CMYK' as const : 'CMYKW' as const,
    quantity,
    bottom_print_mode,
    selected_charge_codes: chargeCodes(body.selected_charge_codes),
    kld_file_id: null,
  };
}

function reviewDetails(result: ReturnType<typeof calculatePackagingPriceV5>) {
  return {
    production_route: result.production_route,
    commercial_rules: result.commercial_rules,
    applied_charges: result.applied_charges,
    validation_errors: result.validation_errors,
    warnings: result.warnings,
  };
}

export async function GET(request: NextRequest) {
  const limit = await checkRateLimit(publicRateLimitKey('pricing-v5-review-preview-get', request), 60, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ ok: false, error: 'too_many_requests' }, { status: 429 });
  try {
    const ctx = await context();
    return NextResponse.json({ ok: true, ...safeCatalog(ctx) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'preview_unavailable' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const limit = await checkRateLimit(publicRateLimitKey('pricing-v5-review-preview-post', request), 40, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ ok: false, error: 'too_many_requests' }, { status: 429 });

  let body: ReviewBody;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }); }

  try {
    const loadedCtx = await context();
    const baseCtx = contextWithRateOverride(loadedCtx, body.rate_override);
    const allowedSizes = baseCtx.sizeProfiles.filter((s) => s.is_active && s.is_quoteable);
    const allowedConstructions = baseCtx.constructions.filter((c) => c.is_active && c.is_quoteable);
    const constructionId = typeof body.construction_id === 'string' ? body.construction_id : allowedConstructions[0]?.id;
    if (!constructionId || !allowedConstructions.some((c) => c.id === constructionId)) {
      return NextResponse.json({ ok: false, error: 'invalid_construction' }, { status: 400 });
    }

    if (body.matrix === true) {
      const rows = allowedSizes.map((size) => ({
        size_profile_id: size.id,
        size_key: size.size_key,
        size_name: size.name,
        pricing_bucket: size.pricing_bucket,
        route: size.gusset_production_mode,
        prices: REVIEW_QUANTITIES.map((quantity) => {
          const result = calculatePackagingPriceV5(baseCtx, pricingInput(baseCtx, body, size.id, constructionId, quantity));
          const safe = toSalesPricingResultV5(result);
          return {
            quantity,
            ok: safe.ok,
            unit_price: safe.ok ? safe.selling_price.unit_price : null,
            product_total: safe.ok ? safe.selling_price.product_total : null,
            currency: safe.selling_price.currency,
            validation_errors: safe.ok ? [] : safe.validation_errors,
          };
        }),
      }));
      return NextResponse.json({ ok: true, construction_id: constructionId, rows }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    const sizeId = typeof body.size_profile_id === 'string' ? body.size_profile_id : allowedSizes[0]?.id;
    const quantity = Math.max(1, Math.min(1000000, Math.floor(Number(body.quantity) || 5000)));
    if (!sizeId || !allowedSizes.some((s) => s.id === sizeId)) {
      return NextResponse.json({ ok: false, error: 'invalid_size' }, { status: 400 });
    }
    const ctx = contextWithRouteOverride(baseCtx, sizeId, body.route_override);
    const result = calculatePackagingPriceV5(ctx, pricingInput(ctx, body, sizeId, constructionId, quantity));
    return NextResponse.json({
      ok: result.ok,
      result: toSalesPricingResultV5(result),
      review_details: reviewDetails(result),
      route_override: body.route_override || null,
      error: result.ok ? undefined : result.validation_errors.join(' '),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'preview_unavailable' }, { status: 503 });
  }
}
