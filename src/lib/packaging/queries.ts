import { createClient } from '@/lib/supabase/server';
import type {
  PackagingPricingTemplate,
  PackagingServiceFamily,
  QuoteOptionalCharge,
} from './types';

/**
 * S24-SPEN-206 — Server-side packaging reads.
 * All queries are organization-scoped; RLS enforces is_org_member as well.
 */

type QueryClient = Awaited<ReturnType<typeof createClient>>;

export async function getPackagingFamilies(
  organizationId: string,
  client?: QueryClient,
): Promise<PackagingServiceFamily[]> {
  const supabase = ((client ?? (await createClient())) as any);
  const { data, error } = await supabase
    .from('packaging_service_families')
    .select('id, organization_id, slug, name, description, pricing_mode, quote_time_inputs, default_unit, default_lead_time, sort_order, is_active')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PackagingServiceFamily[];
}

export async function getPackagingTemplates(
  organizationId: string,
  client?: QueryClient,
): Promise<PackagingPricingTemplate[]> {
  const supabase = ((client ?? (await createClient())) as any);
  const { data, error } = await supabase
    .from('packaging_pricing_templates')
    .select('id, organization_id, family_id, slug, name, description, currency, is_active, calculation_version, allowed_dimension_ranges_json, material_rates_json, print_rules_json, finish_addon_rates_json, moq_tiers_json, setup_charges_json, rush_options_json, lead_time_rules_json, waste_factor_pct')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PackagingPricingTemplate[];
}

export async function getPackagingTemplateById(
  organizationId: string,
  templateId: string,
  client?: QueryClient,
): Promise<PackagingPricingTemplate | null> {
  const supabase = ((client ?? (await createClient())) as any);
  const { data, error } = await supabase
    .from('packaging_pricing_templates')
    .select('id, organization_id, family_id, slug, name, description, currency, is_active, calculation_version, allowed_dimension_ranges_json, material_rates_json, print_rules_json, finish_addon_rates_json, moq_tiers_json, setup_charges_json, rush_options_json, lead_time_rules_json, waste_factor_pct')
    .eq('organization_id', organizationId)
    .eq('id', templateId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as PackagingPricingTemplate) ?? null;
}

export async function getQuoteOptionalCharges(
  organizationId: string,
  quoteId: string,
  client?: QueryClient,
): Promise<QuoteOptionalCharge[]> {
  const supabase = ((client ?? (await createClient())) as any);
  const { data, error } = await supabase
    .from('quote_optional_charges')
    .select('id, organization_id, quote_id, quote_line_item_id, charge_type, label, amount, currency, taxable, notes')
    .eq('organization_id', organizationId)
    .eq('quote_id', quoteId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as QuoteOptionalCharge[];
}
