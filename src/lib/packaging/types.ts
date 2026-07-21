/**
 * S24-SPEN-206 / S24-SPEN-205 — Packaging vertical domain types.
 *
 * These mirror the JSONB rule columns on packaging_pricing_templates and the
 * quote-line snapshot columns on quote_line_items. The pricing engine and all
 * UI surfaces share these shapes so admin preview and Quote Builder can never
 * drift apart.
 */

export type PackagingPricingMode = 'dimensional' | 'service';
export type AreaFormula = 'label_single' | 'pouch_gusset' | 'service';
export type ArtworkStatus = 'print_ready' | 'needs_prepress' | 'not_provided';

export type PackagingQuoteTimeInput = { key: string; label: string; hint?: string };

export type PackagingServiceFamily = {
  id: string;
  organization_id: string;
  slug: string;
  name: string;
  description: string | null;
  pricing_mode: PackagingPricingMode;
  quote_time_inputs: PackagingQuoteTimeInput[];
  default_unit: string;
  default_lead_time: string | null;
  sort_order: number;
  is_active: boolean;
};

export type DimensionRange = { min: number; max: number };

export type AllowedDimensionRanges = {
  area_formula: AreaFormula;
  width_mm?: DimensionRange;
  height_mm?: DimensionRange;
  gusset_mm?: DimensionRange;
};

export type MaterialRate = {
  key: string;
  label: string;
  thickness?: string;
  /** Dimensional materials price per square meter. */
  rate_per_sqm?: number;
  /** Service items price per_unit / per_design / per_job. */
  basis?: 'per_unit' | 'per_design' | 'per_job';
  rate?: number;
};

export type PrintRules = {
  basis: 'color_multiplier' | 'none';
  tiers?: Array<{ max_colors: number; multiplier: number }>;
};

export type FinishAddonRate = {
  key: string;
  label: string;
  basis: 'per_sqm' | 'per_unit';
  rate: number;
};

export type MoqTiers = {
  moq: number;
  tiers: Array<{ min_qty: number; max_qty: number | null; multiplier: number }>;
};

export type SetupCharge = {
  key: string;
  label: string;
  amount: number;
  basis: 'per_job' | 'per_design' | 'per_extra_design';
  required: boolean;
};

export type RushOption = { key: string; label: string; uplift_pct: number };

export type LeadTimeRules = Record<string, string>;

export type PackagingPricingTemplate = {
  id: string;
  organization_id: string;
  family_id: string | null;
  slug: string;
  name: string;
  description: string | null;
  currency: string;
  is_active: boolean;
  calculation_version: number;
  allowed_dimension_ranges_json: AllowedDimensionRanges;
  material_rates_json: MaterialRate[];
  print_rules_json: PrintRules;
  finish_addon_rates_json: FinishAddonRate[];
  moq_tiers_json: MoqTiers;
  setup_charges_json: SetupCharge[];
  rush_options_json: RushOption[];
  lead_time_rules_json: LeadTimeRules;
  waste_factor_pct: number;
};

export type PackagingCalculationInput = {
  width_mm?: number | null;
  height_mm?: number | null;
  gusset_mm?: number | null;
  material_key?: string | null;
  print_colors?: number | null;
  finish_keys?: string[];
  addon_keys?: string[];
  service_item_keys?: string[];
  quantity?: number | null;
  designs?: number | null;
  artwork_status?: ArtworkStatus | null;
  rush_key?: string | null;
  include_optional_setups?: string[];
};

export type PackagingBreakdownLine = {
  key: string;
  label: string;
  amount: number;
  scope: 'per_unit' | 'per_job';
};

export type PackagingCalculationResult = {
  ok: boolean;
  unit_price: number;
  total_price: number;
  currency: string;
  lead_time: string | null;
  breakdown: PackagingBreakdownLine[];
  warnings: string[];
  validation_errors: string[];
  calculation_version: number;
  meta: {
    area_sqm_per_unit: number;
    billable_area_sqm_per_unit: number;
    tier_multiplier: number;
    tier_adjustment_total: number;
    rush_uplift_pct: number;
    setup_total: number;
  };
};

export type PackagingQuoteLineSnapshot = {
  family_id: string;
  family_name: string;
  template_id: string;
  template_name: string;
  input: PackagingCalculationInput;
  spec_summary: string;
};

export type QuoteOptionalChargeType =
  | 'freight'
  | 'pre_press'
  | 'rush'
  | 'proof_sample'
  | 'extra_design'
  | 'cylinder_plate'
  | 'special_finish'
  | 'tax_gst'
  | 'other';

export type QuoteOptionalCharge = {
  id: string;
  organization_id: string;
  quote_id: string;
  quote_line_item_id: string | null;
  charge_type: QuoteOptionalChargeType;
  label: string;
  amount: number;
  currency: string;
  taxable: boolean;
  notes: string | null;
};

export const OPTIONAL_CHARGE_TYPES: Array<{ key: QuoteOptionalChargeType; label: string }> = [
  { key: 'freight', label: 'Freight / Delivery' },
  { key: 'pre_press', label: 'Pre-press artwork setup' },
  { key: 'rush', label: 'Rush order' },
  { key: 'proof_sample', label: 'Proof / Sample' },
  { key: 'extra_design', label: 'Extra design' },
  { key: 'cylinder_plate', label: 'Cylinder / Plate' },
  { key: 'special_finish', label: 'Special finish' },
  { key: 'tax_gst', label: 'Taxes / GST' },
  { key: 'other', label: 'Other' },
];

export const ARTWORK_STATUS_OPTIONS: Array<{ key: ArtworkStatus; label: string }> = [
  { key: 'print_ready', label: 'Print-ready' },
  { key: 'needs_prepress', label: 'Needs pre-press' },
  { key: 'not_provided', label: 'Not provided yet' },
];
