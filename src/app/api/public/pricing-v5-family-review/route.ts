import { NextResponse, type NextRequest } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { checkRateLimit, publicRateLimitKey } from '@/lib/rate-limit/simple';

export const dynamic = 'force-dynamic';

const STARK_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const DEFAULT_REVIEW_QUANTITIES = [500, 1000, 2000, 5000, 10000] as const;
const REVIEW_BASELINE_SLUGS = [
  'stark-center-seal-matrix-v4',
  'stark-3ss-roll-matrix-v4',
  'stark-3ss-pouch-matrix-v4',
] as const;

const FAMILY_KEYS = {
  flat_bottom: 'Flat Bottom Pouches',
  center_seal_roll: 'Center Seal — Roll Form',
  center_seal_pouch: 'Center Seal — Pouch Form',
  three_side_seal_roll: '3 Side Seal — Roll Form',
  three_side_seal_pouch: '3 Side Seal — Pouch Form',
  labels: 'Labels',
  shrink_sleeves: 'Shrink Sleeves',
} as const;

const FAMILY_REVIEW_REQUIREMENTS = {
  flat_bottom: {
    review_stage: 'configuration_required',
    required_inputs: [
      'Approved finished sizes and gusset/base dimensions',
      'Approved constructions / material stacks',
      'Flat-bottom production geometry and frame calculation',
      'Printing method and print-rate basis',
      'Zipper / valve / tear-notch / other add-ons',
      'Quantity ladder, MOQ and non-producible quantities',
      'Waste, margin and conversion-charge rules',
      'Production KLD policy',
    ],
  },
  center_seal_roll: {
    review_stage: 'baseline_migration_review',
    required_inputs: [
      'Confirm roll-form width / repeat / lane geometry',
      'Confirm construction mapping for each workbook row',
      'Confirm quantity bands and matrix rate interpretation',
      'Confirm printing / lamination / slitting treatment',
      'Confirm waste and commercial rules',
      'Confirm which rows remain quoteable in Pricing v5',
    ],
  },
  center_seal_pouch: {
    review_stage: 'baseline_migration_review',
    required_inputs: [
      'Confirm pouch finished-size interpretation',
      'Confirm center-seal pouch conversion geometry',
      'Confirm construction mapping for each workbook row',
      'Confirm quantity ladder / MOQ behavior',
      'Confirm pouch-making and finishing charges',
      'Confirm KLD / artwork requirements',
    ],
  },
  three_side_seal_roll: {
    review_stage: 'baseline_migration_review',
    required_inputs: [
      'Confirm roll-form dimensions and repeat geometry',
      'Confirm construction mapping for each workbook row',
      'Confirm quantity bands and matrix rate interpretation',
      'Confirm printing / lamination / slitting treatment',
      'Confirm waste and commercial rules',
      'Confirm which rows remain quoteable in Pricing v5',
    ],
  },
  three_side_seal_pouch: {
    review_stage: 'baseline_migration_review',
    required_inputs: [
      'Confirm finished pouch dimensions',
      'Confirm three-side-seal conversion geometry',
      'Confirm construction mapping for each workbook row',
      'Confirm quantity ladder / MOQ behavior',
      'Confirm pouch-making and finishing charges',
      'Confirm KLD / artwork requirements',
    ],
  },
  labels: {
    review_stage: 'configuration_required',
    required_inputs: [
      'Approved label dimensions / shape rules',
      'Substrate / facestock / adhesive options',
      'Liner and roll direction requirements',
      'Print method, colors and white/varnish rules',
      'Die-cut / finishing / lamination options',
      'Quantity ladder and MOQ rules',
      'Across / around / repeat / wastage geometry',
      'Commercial margin and add-on rules',
    ],
  },
  shrink_sleeves: {
    review_stage: 'configuration_required',
    required_inputs: [
      'Approved lay-flat width and cut-length rules',
      'Film type / micron / shrink characteristics',
      'Print method and color / white rules',
      'Seaming / solvent / finishing rules',
      'Repeat / lane / cylinder or plate geometry',
      'Quantity ladder and MOQ rules',
      'Waste and conversion-charge rules',
      'Artwork / seam / distortion / KLD requirements',
    ],
  },
} as const;

type TemplateRow = {
  id: string;
  name: string;
  slug: string | null;
  status: string | null;
  is_active: boolean | null;
  calculation_engine_key: string | null;
  currency: string | null;
  family_id: string | null;
};

type MatrixRow = {
  id: string;
  template_id: string;
  supply_form: string | null;
  construction_key: string | null;
  width_mm: number | null;
  height_mm: number | null;
  q1_rate_per_frame: number | null;
  q2_rate_per_frame: number | null;
  q3_rate_per_frame: number | null;
  q4_rate_per_frame: number | null;
  q5_rate_per_frame: number | null;
};

function numberOrNull(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET(request: NextRequest) {
  const limit = await checkRateLimit(publicRateLimitKey('pricing-v5-family-review', request), 60, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ ok: false, error: 'too_many_requests' }, { status: 429 });

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ ok: false, error: 'service_unavailable' }, { status: 503 });

  try {
    const [
      { data: families, error: familyError },
      { data: activeTemplates, error: activeTemplateError },
      { data: reviewTemplates, error: reviewTemplateError },
      { data: matrixRows, error: matrixError },
    ] = await Promise.all([
      (admin as any)
        .from('packaging_service_families')
        .select('id,name,slug,pricing_mode,is_active,is_quoteable')
        .eq('organization_id', STARK_ORG_ID)
        .order('name'),
      (admin as any)
        .from('packaging_pricing_templates')
        .select('id,name,slug,status,is_active,calculation_engine_key,currency,family_id')
        .eq('organization_id', STARK_ORG_ID)
        .eq('is_active', true)
        .order('name'),
      (admin as any)
        .from('packaging_pricing_templates')
        .select('id,name,slug,status,is_active,calculation_engine_key,currency,family_id')
        .eq('organization_id', STARK_ORG_ID)
        .in('slug', [...REVIEW_BASELINE_SLUGS])
        .order('name'),
      (admin as any)
        .from('packaging_pricing_matrix_rows')
        .select('id,template_id,supply_form,construction_key,width_mm,height_mm,q1_rate_per_frame,q2_rate_per_frame,q3_rate_per_frame,q4_rate_per_frame,q5_rate_per_frame')
        .eq('organization_id', STARK_ORG_ID)
        .order('width_mm')
        .order('height_mm'),
    ]);

    if (familyError || activeTemplateError || reviewTemplateError || matrixError) {
      return NextResponse.json({ ok: false, error: 'family_review_unavailable' }, { status: 503 });
    }

    const familyList = Array.isArray(families) ? families : [];
    const activeTemplateList = (Array.isArray(activeTemplates) ? activeTemplates : []) as TemplateRow[];
    const reviewTemplateList = (Array.isArray(reviewTemplates) ? reviewTemplates : []) as TemplateRow[];
    const rowList = (Array.isArray(matrixRows) ? matrixRows : []) as MatrixRow[];

    const compactTemplate = (template: TemplateRow) => {
      const rows = rowList.filter((row) => row.template_id === template.id);
      return {
        id: template.id,
        name: template.name,
        slug: template.slug,
        status: template.status,
        is_active: template.is_active,
        engine: template.calculation_engine_key,
        currency: template.currency,
        review_source: 'v4_migration_baseline',
        quantities: [...DEFAULT_REVIEW_QUANTITIES],
        row_count: rows.length,
        rows: rows.map((row) => ({
          id: row.id,
          supply_form: row.supply_form,
          construction_key: row.construction_key,
          width_mm: numberOrNull(row.width_mm),
          height_mm: numberOrNull(row.height_mm),
          rates: [row.q1_rate_per_frame, row.q2_rate_per_frame, row.q3_rate_per_frame, row.q4_rate_per_frame, row.q5_rate_per_frame].map(numberOrNull),
        })),
      };
    };

    const reviewTemplateBySlug = (slug: string) => reviewTemplateList.find((template) => template.slug === slug);
    const centerSeal = reviewTemplateBySlug('stark-center-seal-matrix-v4');
    const threeRoll = reviewTemplateBySlug('stark-3ss-roll-matrix-v4');
    const threePouch = reviewTemplateBySlug('stark-3ss-pouch-matrix-v4');
    const flatFamily = familyList.find((family: any) => String(family.name).toLowerCase().includes('flat bottom'));
    const labelsFamily = familyList.find((family:any)=>String(family.slug)==='labels');
    const shrinkFamily = familyList.find((family:any)=>String(family.slug)==='shrink-sleeves');

    const result = {
      flat_bottom: {
        key: 'flat_bottom',
        name: FAMILY_KEYS.flat_bottom,
        state: 'needs_configuration',
        ...FAMILY_REVIEW_REQUIREMENTS.flat_bottom,
        pricing_mode: flatFamily?.pricing_mode ?? 'not_configured',
        template: null,
        clarification: 'No published Stark Flat Bottom pricing template exists. Akshay must confirm approved sizes, constructions, geometry and pricing rules. SETU will not invent prices or reuse Stand-Up geometry.',
      },
      center_seal_roll: {
        key: 'center_seal_roll',
        name: FAMILY_KEYS.center_seal_roll,
        state: centerSeal ? 'published_baseline' : 'missing',
        ...FAMILY_REVIEW_REQUIREMENTS.center_seal_roll,
        template: centerSeal ? compactTemplate(centerSeal) : null,
        clarification: 'Current Stark Center Seal v4 workbook is loaded as a migration-review baseline only. It remains inactive and does not alter live pricing. Review it now, then confirm the v5 Roll Form/Pouch Form split and geometry.',
      },
      center_seal_pouch: {
        key: 'center_seal_pouch',
        name: FAMILY_KEYS.center_seal_pouch,
        state: centerSeal ? 'published_baseline' : 'missing',
        ...FAMILY_REVIEW_REQUIREMENTS.center_seal_pouch,
        template: centerSeal ? compactTemplate(centerSeal) : null,
        clarification: 'Current Stark Center Seal v4 workbook is loaded as a migration-review baseline only. It remains inactive and does not alter live pricing. Review it now, then confirm the v5 Roll Form/Pouch Form split and geometry.',
      },
      three_side_seal_roll: {
        key: 'three_side_seal_roll',
        name: FAMILY_KEYS.three_side_seal_roll,
        state: threeRoll ? 'published_baseline' : 'missing',
        ...FAMILY_REVIEW_REQUIREMENTS.three_side_seal_roll,
        template: threeRoll ? compactTemplate(threeRoll) : null,
        clarification: 'Current Stark 3SS Roll Form v4 workbook is loaded as a migration-review baseline only. It remains inactive and does not alter live pricing.',
      },
      labels: {
        key:'labels', name:FAMILY_KEYS.labels, state:'needs_configuration',
        ...FAMILY_REVIEW_REQUIREMENTS.labels,
        pricing_mode:labelsFamily?.pricing_mode??'not_configured', template:null,
        clarification:'Labels is an active Stark service family but does not yet have an approved Pricing v5 template. Review/fix must capture label-specific sizes, substrates, print method, finishing, production geometry and commercial rules before Sales quoting is enabled.',
      },
      shrink_sleeves: {
        key:'shrink_sleeves', name:FAMILY_KEYS.shrink_sleeves, state:'needs_configuration',
        ...FAMILY_REVIEW_REQUIREMENTS.shrink_sleeves,
        pricing_mode:shrinkFamily?.pricing_mode??'not_configured', template:null,
        clarification:'Shrink Sleeves is an active Stark service family but does not yet have an approved Pricing v5 template. Review/fix must capture sleeve dimensions, substrate/micron, print method, seaming/finishing, production geometry and commercial rules before Sales quoting is enabled.',
      },
      three_side_seal_pouch: {
        key: 'three_side_seal_pouch',
        name: FAMILY_KEYS.three_side_seal_pouch,
        state: threePouch ? 'published_baseline' : 'missing',
        ...FAMILY_REVIEW_REQUIREMENTS.three_side_seal_pouch,
        template: threePouch ? compactTemplate(threePouch) : null,
        clarification: 'Current Stark 3SS Pouch Form v4 workbook is loaded as a migration-review baseline only. It remains inactive and does not alter live pricing.',
      },
    };

    return NextResponse.json({
      ok: true,
      source: 'stark_production_configuration',
      note: 'Active pricing templates are left unchanged. Inactive v4 workbook matrices are exposed here only as migration-review baselines. Flat Bottom has no configured pricing and no price is fabricated.',
      active_template_count: activeTemplateList.length,
      families: result,
      configured_family_count: Object.values(result).filter((item) => item.state === 'published_baseline').length,
      review_context_count: Object.keys(FAMILY_REVIEW_REQUIREMENTS).length,
      activation_ready_count: 0,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[pricing-v5-family-review] failed', error);
    return NextResponse.json({ ok: false, error: 'family_review_unavailable' }, { status: 503 });
  }
}
