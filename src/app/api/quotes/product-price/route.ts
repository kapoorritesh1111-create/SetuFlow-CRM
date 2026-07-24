import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function firstPositive(values: unknown[]) {
  for (const value of values) {
    const parsed = numberValue(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const workspace = await getWorkspaceAccess();
    if (!workspace?.organization || !workspace?.user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const productId = request.nextUrl.searchParams.get('productId')?.trim() ?? '';
    const variantId = request.nextUrl.searchParams.get('variantId')?.trim() ?? '';
    const organizationCurrency = (workspace.organization as { default_currency?: string | null }).default_currency;
    const currency = (request.nextUrl.searchParams.get('currency') || organizationCurrency || 'USD')
      .trim()
      .toUpperCase()
      .slice(0, 3);

    if (!UUID_RE.test(productId) || (variantId && !UUID_RE.test(variantId))) {
      return NextResponse.json({ error: 'Invalid product selection.' }, { status: 400 });
    }

    const supabase: any = await createClient();
    const { data: rules, error } = await supabase
      .from('product_pricing_rules')
      .select([
        'id',
        'product_id',
        'product_variant_id',
        'pack_label',
        'moq',
        'pricing_type',
        'units_per_case',
        'fob_inr',
        'fob_usd',
        'fob_usd_per_case',
        'fob_usd_per_unit',
        'ex_factory_inr',
        'ex_factory_usd',
        'ex_factory_usd_per_case',
        'ex_factory_usd_per_unit',
        'fob_input_amount',
        'fob_input_currency',
        'ex_factory_input_amount',
        'ex_factory_input_currency',
        'is_active',
        'sort_order',
      ].join(','))
      .eq('organization_id', workspace.organization.id)
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const candidates = (rules ?? []) as any[];
    const rule =
      (variantId ? candidates.find((item) => item.product_variant_id === variantId) : null) ??
      candidates.find((item) => !item.product_variant_id) ??
      candidates[0] ??
      null;

    if (!rule) {
      return NextResponse.json({
        currency,
        casePrice: null,
        unitPrice: null,
        moq: 1,
        pack: 'Case',
        basis: 'FOB',
      });
    }

    const isInr = currency === 'INR';
    const matchingFobInput = String(rule.fob_input_currency ?? '').toUpperCase() === currency ? rule.fob_input_amount : null;
    const matchingExFactoryInput = String(rule.ex_factory_input_currency ?? '').toUpperCase() === currency ? rule.ex_factory_input_amount : null;

    const casePrice = isInr
      ? firstPositive([rule.fob_inr, matchingFobInput, rule.ex_factory_inr, matchingExFactoryInput])
      : firstPositive([
          rule.fob_usd_per_case,
          rule.fob_usd,
          matchingFobInput,
          rule.ex_factory_usd_per_case,
          rule.ex_factory_usd,
          matchingExFactoryInput,
        ]);

    const unitPrice = isInr
      ? null
      : firstPositive([rule.fob_usd_per_unit, rule.ex_factory_usd_per_unit]);
    const unitsPerCase = numberValue(rule.units_per_case);

    return NextResponse.json({
      currency,
      casePrice,
      unitPrice: unitPrice ?? (casePrice && unitsPerCase ? casePrice / unitsPerCase : null),
      moq: numberValue(rule.moq) ?? 1,
      pack: rule.pack_label || 'Case',
      basis: rule.pricing_type || 'FOB',
      pricingRuleId: rule.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load product pricing.' },
      { status: 500 },
    );
  }
}
