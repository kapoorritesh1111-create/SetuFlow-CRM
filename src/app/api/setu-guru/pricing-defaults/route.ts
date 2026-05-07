import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasSupabaseEnv } from '@/lib/env';

const COUNTRY_CURRENCY: Record<string, string> = {
  ireland: 'EUR',
  'united kingdom': 'GBP',
  uk: 'GBP',
  england: 'GBP',
  india: 'INR',
  'united states': 'USD',
  usa: 'USD',
  'united arab emirates': 'AED',
  uae: 'AED',
};

const BASE_DRAFT_DEFAULTS = {
  currency: 'USD',
  margin_mode: 'markup',
  inland_transport_cost: 0,
  export_customs_cost: 0,
  port_handling_cost: 0,
  freight_cost: 0,
  insurance_cost: 0,
  import_duty_percent: 0,
  destination_charges: 0,
  local_delivery_cost: 0,
  internal_margin_percent: 18,
  distributor_margin_percent: 25,
  retail_margin_percent: 35,
};

function asText(value: unknown) {
  return String(value ?? '').trim();
}

function inferCountry(question: string, organizationName: string, orgCountry?: string | null) {
  const combined = `${question} ${orgCountry ?? ''} ${organizationName}`.toLowerCase();
  if (combined.includes('ireland') || combined.includes('irish') || combined.includes('dublin') || combined.includes('avanti foods')) return 'Ireland';
  if (combined.includes('united kingdom') || combined.includes(' uk ') || combined.includes('england')) return 'United Kingdom';
  if (combined.includes('india')) return 'India';
  if (combined.includes('united states') || combined.includes(' usa ') || combined.includes('america')) return 'United States';
  if (combined.includes('united arab emirates') || combined.includes(' uae ') || combined.includes('dubai')) return 'United Arab Emirates';
  return asText(orgCountry) || 'new export organization';
}

function currencyForCountry(countryLabel: string, fallback = 'USD') {
  const key = countryLabel.toLowerCase();
  const exact = COUNTRY_CURRENCY[key];
  if (exact) return exact;
  const partial = Object.entries(COUNTRY_CURRENCY).find(([country]) => key.includes(country));
  return partial?.[1] ?? fallback;
}

function countryText(countryLabel: string) {
  const lower = countryLabel.toLowerCase();
  if (lower.includes('ireland')) return 'Ireland/EU setup';
  if (lower.includes('united kingdom')) return 'UK setup';
  if (lower.includes('india')) return 'India setup';
  if (lower.includes('united states')) return 'US setup';
  if (lower.includes('united arab emirates')) return 'UAE setup';
  return 'new export organization setup';
}

function recommendation(countryLabel: string, fallbackCurrency?: string | null, marketName?: string | null) {
  const defaults = { ...BASE_DRAFT_DEFAULTS, currency: currencyForCountry(countryLabel, fallbackCurrency ?? 'USD') };
  const marketText = marketName ? ` Default market: ${marketName}.` : '';
  return {
    defaults,
    answer: [
      `For a ${countryText(countryLabel)}, I would treat pricing calculator defaults as draft commercial assumptions, not final industry truth.${marketText}`,
      `Recommended starter values: currency ${defaults.currency}, margin mode ${defaults.margin_mode}, internal margin/markup ${defaults.internal_margin_percent}%, distributor margin ${defaults.distributor_margin_percent}%, and retail margin ${defaults.retail_margin_percent}%.`,
      'Keep freight, insurance, duty, destination charges, and local delivery at 0 until a lane/product quote or broker source confirms them. This avoids hiding unknown landed-cost assumptions inside defaults.',
      'I can apply these as organization-level calculator defaults, then you should review and save/adjust them in Product Management or category/product pricing before quoting.',
    ].join('\n\n'),
  };
}

async function loadOrganizationSetupContext(supabase: any, organizationId: string) {
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, default_currency, headquarters_country, default_country_id, default_market_id, countries:default_country_id(name, iso2_code, markets:market_id(id, name, market_code)), markets:default_market_id(id, name, market_code)')
    .eq('id', organizationId)
    .maybeSingle();

  const defaultCountry = Array.isArray(org?.countries) ? org.countries[0] : org?.countries;
  const defaultMarket = (Array.isArray(org?.markets) ? org.markets[0] : org?.markets) ?? defaultCountry?.markets ?? null;
  return {
    organization: org,
    countryName: defaultCountry?.name ?? org?.headquarters_country ?? null,
    marketName: defaultMarket?.name ?? null,
    fallbackCurrency: org?.default_currency ?? null,
  };
}

export async function POST(request: Request) {
  try {
    if (!hasSupabaseEnv) return NextResponse.json({ answer: 'Supabase is not configured for Setu Guru pricing defaults.', confidence: 'low' }, { status: 500 });
    const body = await request.json().catch(() => ({}));
    const question = asText(body.question);
    const action = asText(body.action) || 'suggest';
    const workspace = await getWorkspaceAccess();
    if (!workspace.user || !workspace.organization) return NextResponse.json({ answer: 'Please sign in before applying pricing defaults.', confidence: 'low' }, { status: 401 });

    const supabase = await createClient();
    const orgContext = await loadOrganizationSetupContext(supabase as any, workspace.organization.id);
    const countryLabel = inferCountry(question, workspace.organization.name ?? '', orgContext.countryName ?? asText(body.country));
    const rec = recommendation(countryLabel, orgContext.fallbackCurrency, orgContext.marketName);

    if (action !== 'apply') {
      return NextResponse.json({
        answer: rec.answer,
        confidence: orgContext.countryName || question ? 'medium' : 'low',
        defaults: rec.defaults,
        country: countryLabel,
        market: orgContext.marketName,
        nextAction: 'Apply draft pricing defaults',
        actionIntent: 'apply_pricing_defaults',
      });
    }

    const payload = {
      organization_id: workspace.organization.id,
      rule_scope: 'organization',
      category_id: null,
      ...rec.defaults,
      is_active: true,
      updated_by: workspace.user.id,
    };

    const db = supabase as any;
    const { data: existing, error: existingError } = await db
      .from('pricing_calculator_default_rules')
      .select('id')
      .eq('organization_id', workspace.organization.id)
      .eq('rule_scope', 'organization')
      .is('category_id', null)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;

    const mutation = existing?.id
      ? db.from('pricing_calculator_default_rules').update(payload).eq('id', existing.id)
      : db.from('pricing_calculator_default_rules').insert({ ...payload, created_by: workspace.user.id });
    const { error } = await mutation;
    if (error) throw error;

    await db.from('audit_logs').insert({
      organization_id: workspace.organization.id,
      actor_user_id: workspace.user.id,
      entity_type: 'pricing_calculator_default_rules',
      entity_id: existing?.id ?? null,
      action: 'pricing_defaults_applied_by_setu_guru',
      payload: { defaults: rec.defaults, country_context: countryLabel, default_market: orgContext.marketName, source: 'setu_guru_draft_recommendation' },
    });

    return NextResponse.json({
      answer: `I applied draft organization-level pricing calculator defaults for ${countryLabel}${orgContext.marketName ? ` / ${orgContext.marketName}` : ''}. Review them in Product Management / pricing defaults before using them in live quotes.`,
      confidence: 'medium',
      defaults: rec.defaults,
      country: countryLabel,
      market: orgContext.marketName,
      nextAction: 'Open Product Management to review and save/adjust defaults',
      actionHref: '/admin/product-management',
    });
  } catch (error) {
    return NextResponse.json({ answer: error instanceof Error ? error.message : 'Setu Guru could not handle pricing defaults.', confidence: 'low' }, { status: 500 });
  }
}
