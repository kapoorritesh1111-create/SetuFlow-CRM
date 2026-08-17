import type { PricingContext, RecipeItem, SupPricingInput } from './types';

export const SUP_CONSTRUCTION_LABELS: Record<SupPricingInput['construction_key'], string> = {
  glossy_foil: 'Glossy + Foil',
  matte_foil: 'Matte + Foil',
  glossy_clear_window: 'Glossy Clear Window',
  matte_frosted_window: 'Matte Frosted Window',
};

export const SUP_CONSTRUCTION_LAYER_ROLES: Record<SupPricingInput['construction_key'], string[]> = {
  glossy_foil: ['outer_layer', 'middle_layer'],
  matte_foil: ['outer_layer', 'middle_layer'],
  glossy_clear_window: ['outer_layer'],
  matte_frosted_window: ['outer_layer', 'middle_layer'],
};

export const SUP_PRINT_OPTIONS = ['CMYK', 'CMYKW'] as const;

type SupAvailabilityContext = Pick<PricingContext, 'template' | 'masters' | 'recipes' | 'variations'>;

function matchesVariation(item: RecipeItem, variationKey: string): boolean {
  const keys = item.condition_json?.variation_keys;
  return !Array.isArray(keys) || keys.includes(variationKey);
}

function recipeForRole(context: SupAvailabilityContext, constructionKey: string, roleKey: string, variationKey: string) {
  return context.recipes
    .filter((item) => (item.construction_key === constructionKey || item.construction_key === '*') && item.role_key === roleKey)
    .find((item) => matchesVariation(item, variationKey)) ?? null;
}

function roleHasRatedMaster(context: SupAvailabilityContext, constructionKey: string, roleKey: string, variationKey: string) {
  const recipe = recipeForRole(context, constructionKey, roleKey, variationKey);
  if (!recipe || recipe.source_type !== 'cost_master' || !recipe.cost_master_item_id) return false;
  const master = context.masters.find((item) => item.id === recipe.cost_master_item_id);
  return Boolean(master && master.current_rate != null && Number.isFinite(Number(master.current_rate)) && Number(master.current_rate) >= 0);
}

export function isSupConstructionPrintReady(
  context: SupAvailabilityContext,
  variationKey: string,
  constructionKey: SupPricingInput['construction_key'],
  print: SupPricingInput['print'],
) {
  const configured = context.template.quote_config_json?.constructions;
  if (Array.isArray(configured) && !configured.includes(constructionKey)) return false;
  const roles = [
    ...SUP_CONSTRUCTION_LAYER_ROLES[constructionKey],
    'inner_pe',
    'adhesive',
    print === 'CMYK' ? 'printing_cmyk' : 'printing_cmykw',
    'lamination',
    'slitting',
    'pouching',
  ];
  return roles.every((role) => roleHasRatedMaster(context, constructionKey, role, variationKey));
}

export type SupConstructionAvailabilityRow = {
  template_id: string;
  variation_id: string;
  constructions: Array<{
    key: SupPricingInput['construction_key'];
    label: string;
    print_options: Array<SupPricingInput['print']>;
  }>;
};

/**
 * Build a Sales-safe readiness projection. It uses confidential recipes/rates on
 * the server, but returns only construction keys/labels and ready print choices.
 */
export function buildSupConstructionAvailability(context: SupAvailabilityContext): SupConstructionAvailabilityRow[] {
  const configured = context.template.quote_config_json?.constructions;
  const allKeys = Object.keys(SUP_CONSTRUCTION_LABELS) as Array<SupPricingInput['construction_key']>;
  const constructionKeys = Array.isArray(configured)
    ? configured.filter((key): key is SupPricingInput['construction_key'] => allKeys.includes(key as SupPricingInput['construction_key']))
    : allKeys;

  return context.variations.map((variation) => ({
    template_id: context.template.id,
    variation_id: variation.id,
    constructions: constructionKeys.map((key) => ({
      key,
      label: SUP_CONSTRUCTION_LABELS[key],
      print_options: SUP_PRINT_OPTIONS.filter((print) => isSupConstructionPrintReady(context, variation.variation_key, key, print)),
    })).filter((item) => item.print_options.length > 0),
  }));
}
