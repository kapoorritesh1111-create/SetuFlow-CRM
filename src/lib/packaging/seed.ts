import { PACKAGING_FAMILY_SEEDS, PACKAGING_TEMPLATE_SEEDS } from './seed-data';

/**
 * S24-SPEN-207 — Idempotent packaging seeding.
 *
 * Safe to call repeatedly for the same organization: upserts on
 * (organization_id, slug) with ignoreDuplicates so existing rows — including
 * admin-edited templates — are never overwritten.
 *
 * Called from client-onboarding provisioning when the packaging vertical is
 * activated (trial template packaging_converter or explicit vertical_key).
 */
export async function seedPackagingDefaults(
  adminClient: unknown,
  organizationId: string,
): Promise<{ familiesSeeded: number; templatesSeeded: number }> {
  const admin = adminClient as any;
  if (!organizationId) return { familiesSeeded: 0, templatesSeeded: 0 };

  const familyRows = PACKAGING_FAMILY_SEEDS.map((family) => ({
    organization_id: organizationId,
    slug: family.slug,
    name: family.name,
    description: family.description,
    pricing_mode: family.pricing_mode,
    quote_time_inputs: family.quote_time_inputs,
    default_unit: family.default_unit,
    default_lead_time: family.default_lead_time,
    sort_order: family.sort_order,
    is_active: true,
  }));

  const { error: familyError } = await admin
    .from('packaging_service_families')
    .upsert(familyRows, { onConflict: 'organization_id,slug', ignoreDuplicates: true });
  if (familyError) throw new Error(familyError.message);

  const { data: families, error: readError } = await admin
    .from('packaging_service_families')
    .select('id, slug')
    .eq('organization_id', organizationId);
  if (readError) throw new Error(readError.message);

  const familyIdBySlug = new Map<string, string>((families ?? []).map((row: any) => [row.slug, row.id]));

  const templateRows = PACKAGING_TEMPLATE_SEEDS.map((template) => ({
    organization_id: organizationId,
    family_id: familyIdBySlug.get(template.family_slug) ?? null,
    slug: template.slug,
    name: template.name,
    description: template.description,
    currency: template.currency,
    is_active: true,
    calculation_version: 1,
    allowed_dimension_ranges_json: template.allowed_dimension_ranges_json,
    material_rates_json: template.material_rates_json,
    print_rules_json: template.print_rules_json,
    finish_addon_rates_json: template.finish_addon_rates_json,
    moq_tiers_json: template.moq_tiers_json,
    setup_charges_json: template.setup_charges_json,
    rush_options_json: template.rush_options_json,
    lead_time_rules_json: template.lead_time_rules_json,
    waste_factor_pct: template.waste_factor_pct,
  }));

  const { error: templateError } = await admin
    .from('packaging_pricing_templates')
    .upsert(templateRows, { onConflict: 'organization_id,slug', ignoreDuplicates: true });
  if (templateError) throw new Error(templateError.message);

  return { familiesSeeded: familyRows.length, templatesSeeded: templateRows.length };
}
