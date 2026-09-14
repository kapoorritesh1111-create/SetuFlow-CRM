import { NextResponse, type NextRequest } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { checkRateLimit, publicRateLimitKey } from '@/lib/rate-limit/simple';

export const dynamic = 'force-dynamic';

const STARK_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const DEFAULT_REVIEW_QUANTITIES = [500, 1000, 2000, 5000, 10000] as const;

const FAMILY_KEYS = {
  flat_bottom: 'Flat Bottom Pouches',
  center_seal_roll: 'Center Seal — Roll Form',
  center_seal_pouch: 'Center Seal — Pouch Form',
  three_side_seal_roll: '3 Side Seal — Roll Form',
  three_side_seal_pouch: '3 Side Seal — Pouch Form',
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
    const [{ data: families, error: familyError }, { data: templates, error: templateError }, { data: matrixRows, error: matrixError }] = await Promise.all([
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
        .from('packaging_pricing_matrix_rows')
        .select('id,template_id,supply_form,construction_key,width_mm,height_mm,q1_rate_per_frame,q2_rate_per_frame,q3_rate_per_frame,q4_rate_per_frame,q5_rate_per_frame')
        .eq('organization_id', STARK_ORG_ID)
        .order('width_mm')
        .order('height_mm'),
    ]);

    if (familyError || templateError || matrixError) {
      return NextResponse.json({ ok: false, error: 'family_review_unavailable' }, { status: 503 });
    }

    const familyList = Array.isArray(families) ? families : [];
    const templateList = (Array.isArray(templates) ? templates : []) as TemplateRow[];
    const rowList = (Array.isArray(matrixRows) ? matrixRows : []) as MatrixRow[];

    const compactTemplate = (template: TemplateRow) => {
      const rows = rowList.filter((row) => row.template_id === template.id);
      return {
        id: template.id,
        name: template.name,
        status: template.status,
        engine: template.calculation_engine_key,
        currency: template.currency,
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

    const findTemplate = (needle: string) => templateList.find((template) => template.name.toLowerCase().includes(needle));
    const centerSeal = findTemplate('center seal workbook');
    const threeRoll = findTemplate('3ss roll form');
    const threePouch = findTemplate('3ss pouch form');
    const flatFamily = familyList.find((family: any) => String(family.name).toLowerCase().includes('flat bottom'));

    const result = {
      flat_bottom: {
        key: 'flat_bottom',
        name: FAMILY_KEYS.flat_bottom,
        state: 'needs_configuration',
        pricing_mode: flatFamily?.pricing_mode ?? 'not_configured',
        template: null,
        clarification: 'No published Stark Flat Bottom pricing template exists. Akshay must confirm approved sizes, constructions, geometry and pricing rules. SETU will not invent prices or reuse Stand-Up geometry.',
      },
      center_seal_roll: {
        key: 'center_seal_roll',
        name: FAMILY_KEYS.center_seal_roll,
        state: centerSeal ? 'published_baseline' : 'missing',
        template: centerSeal ? compactTemplate(centerSeal) : null,
        clarification: 'Current Stark Center Seal workbook is one shared matrix baseline and does not yet separate Roll Form from Pouch Form. Review it now, then confirm the v5 migration split and geometry.',
      },
      center_seal_pouch: {
        key: 'center_seal_pouch',
        name: FAMILY_KEYS.center_seal_pouch,
        state: centerSeal ? 'published_baseline' : 'missing',
        template: centerSeal ? compactTemplate(centerSeal) : null,
        clarification: 'Current Stark Center Seal workbook is one shared matrix baseline and does not yet separate Roll Form from Pouch Form. Review it now, then confirm the v5 migration split and geometry.',
      },
      three_side_seal_roll: {
        key: 'three_side_seal_roll',
        name: FAMILY_KEYS.three_side_seal_roll,
        state: threeRoll ? 'published_baseline' : 'missing',
        template: threeRoll ? compactTemplate(threeRoll) : null,
        clarification: 'This is the current published workbook/matrix baseline for migration review. It is not yet the detailed v5 formula engine.',
      },
      three_side_seal_pouch: {
        key: 'three_side_seal_pouch',
        name: FAMILY_KEYS.three_side_seal_pouch,
        state: threePouch ? 'published_baseline' : 'missing',
        template: threePouch ? compactTemplate(threePouch) : null,
        clarification: 'This is the current published workbook/matrix baseline for migration review. It is not yet the detailed v5 formula engine.',
      },
    };

    return NextResponse.json({
      ok: true,
      source: 'stark_production_configuration',
      note: 'Matrix rates are the current published workbook baseline and are shown for owner review only. Flat Bottom has no configured pricing and no price is fabricated.',
      families: result,
      configured_family_count: Object.values(result).filter((item) => item.state === 'published_baseline').length,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[pricing-v5-family-review] failed', error);
    return NextResponse.json({ ok: false, error: 'family_review_unavailable' }, { status: 503 });
  }
}
