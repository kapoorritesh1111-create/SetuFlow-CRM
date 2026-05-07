import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasSupabaseEnv } from '@/lib/env';

const IRELAND_DRAFT_DEFAULTS = {
  currency: 'EUR',
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

function isIreland(question: string, organizationName: string) {
  const value = `${question} ${organizationName}`.toLowerCase();
  return value.includes('ireland') || value.includes('irish') || value.includes('dublin') || value.includes('avanti foods');
}

function recommendation(countryLabel: string) {
  const isIe = countryLabel.toLowerCase().includes('ireland');
  const defaults = isIe ? IRELAND_DRAFT_DEFAULTS : { ...IRELAND_DRAFT_DEFAULTS, currency: 'USD' };
  const countryText = isIe ? 'Ireland/EU setup' : 'new export organization setup';
  return {
    defaults,
    countryText,
    answer: [
      `For a ${countryText}, I would treat pricing calculator defaults as draft commercial assumptions, not final industry truth.`,
      `Recommended starter values: currency ${defaults.currency}, margin mode ${defaults.margin_mode}, internal margin/markup ${defaults.internal_margin_percent}%, distributor margin ${defaults.distributor_margin_percent}%, and retail margin ${defaults.retail_margin_percent}%.`,
      'Keep freight, insurance, duty, destination charges, and local delivery at 0 until a lane/product quote or broker source confirms them. This avoids hiding unknown landed-cost assumptions inside defaults.',
      'I can apply these as organization-level calculator defaults, then you should review and save/adjust them in Product Management or category/product pricing before quoting.',
    ].join('\n\n'),
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

    const countryLabel = isIreland(question, workspace.organization.name ?? '') ? 'Ireland' : asText(body.country) || 'new export organization';
    const rec = recommendation(countryLabel);

    if (action !== 'apply') {
      return NextResponse.json({
        answer: rec.answer,
        confidence: 'medium',
        defaults: rec.defaults,
        nextAction: 'Apply draft pricing defaults',
        actionIntent: 'apply_pricing_defaults',
      });
    }

    const supabase = await createClient();
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
      payload: { defaults: rec.defaults, country_context: countryLabel, source: 'setu_guru_draft_recommendation' },
    });

    return NextResponse.json({
      answer: `I applied draft organization-level pricing calculator defaults for ${countryLabel}. Review them in Product Management / pricing defaults before using them in live quotes.`,
      confidence: 'medium',
      defaults: rec.defaults,
      nextAction: 'Open Product Management to review and save/adjust defaults',
      actionHref: '/admin/product-management',
    });
  } catch (error) {
    return NextResponse.json({ answer: error instanceof Error ? error.message : 'Setu Guru could not handle pricing defaults.', confidence: 'low' }, { status: 500 });
  }
}
