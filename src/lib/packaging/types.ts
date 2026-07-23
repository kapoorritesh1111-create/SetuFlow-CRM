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
  icon_key?: string | null;
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

export type AdhesiveOption = { key: string; label: string };

export type PrintProcess = 'digital' | 'flexo';

/** S27-STARK-B1 — Flexo cylinder cost tiers by repeat length. The rate is
 * per color (each color = one cylinder); larger repeat lengths need larger,
 * more expensive cylinders. Admin-configurable, same pattern as MOQ tiers. */
export type CylinderRateTier = { max_repeat_mm: number; rate_per_color: number };

export type FlexoRules = {
  repeat_length_mm: DimensionRange;
  web_width_mm: DimensionRange;
  cylinder_rate_tiers: CylinderRateTier[];
};

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
  /** S24-SPEN-214: descriptive adhesive/build options; no price impact by default. */
  adhesive_options_json?: AdhesiveOption[];
  /** S27-STARK-B1: 'flexo' unlocks cylinder cost calculation. Defaults to 'digital' for
   * every existing template — no behavior change unless explicitly set. */
  print_process?: PrintProcess;
  flexo_rules_json?: FlexoRules | null;
};

export type PackagingCalculationInput = {
  width_mm?: number | null;
  height_mm?: number | null;
  gusset_mm?: number | null;
  material_key?: string | null;
  adhesive_key?: string | null;
  print_colors?: number | null;
  finish_keys?: string[];
  addon_keys?: string[];
  service_item_keys?: string[];
  quantity?: number | null;
  designs?: number | null;
  artwork_status?: ArtworkStatus | null;
  rush_key?: string | null;
  include_optional_setups?: string[];
  /** S27-STARK-B1: flexo cylinder repeat length. Ignored for digital templates. */
  repeat_length_mm?: number | null;
  /** S27-STARK-F2: flexo web width (press width the job actually runs at).
   * Was defined on FlexoRules since Phase B but never captured from the
   * buyer/quote side or validated by the pricing engine until now. */
  web_width_mm?: number | null;
  /** S27-STARK-B3: buyer/job already has a cylinder on file — skip the cylinder charge. */
  reuse_existing_cylinder?: boolean;
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
    cylinder_cost?: number;
  };
};

export type PackagingProofStatus = 'pending' | 'approved' | 'rejected';

export type PackagingProof = {
  id: string;
  organization_id: string;
  quote_line_item_id: string;
  version: number;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  status: PackagingProofStatus;
  reviewed_at: string | null;
  review_comment: string | null;
  approval_token: string;
  token_expires_at: string;
};

export type PackagingSavedSpec = {
  id: string;
  organization_id: string;
  lead_id: string;
  family_id: string | null;
  template_id: string | null;
  name: string;
  input_snapshot_json: { input: PackagingCalculationInput; family_name?: string; template_name?: string };
  last_unit_price: number | null;
  last_currency: string | null;
  last_calculated_at: string | null;
  created_at: string;
  updated_at: string;
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

/**
 * S27-STARK-REFLIB-01 — Shared reference-data library (materials, finishes,
 * service items). Stored per customer (organization_id), separate from the
 * global starter catalog in packaging_reference_item_defaults. Templates
 * still store their own key/label/rate on save (JSONB snapshot, unchanged
 * shape — MaterialRate / FinishAddonRate above), so nothing about pricing
 * or existing quotes changes. The library only powers the *authoring*
 * experience: instead of free-typing a material/finish/service name in the
 * Pricing Template Builder, you pick from (or add to) this org's own list.
 */
export type PackagingReferenceCategory = 'material' | 'finish' | 'service_item';

export type PackagingReferenceItem = {
  id: string;
  organization_id: string;
  category: PackagingReferenceCategory;
  key: string;
  name: string;
  description: string | null;
  default_thickness: string | null;
  default_unit_hint: string | null;
  /** S27-STARK-F1: optional hex swatch color, e.g. '#F7F5F0'. Not a photo — no upload pipeline built yet. */
  swatch_color: string | null;
  is_active: boolean;
  source: 'default_seed' | 'migrated' | 'custom';
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type PackagingReferenceItemDefault = {
  id: string;
  category: PackagingReferenceCategory;
  key: string;
  name: string;
  description: string | null;
  default_thickness: string | null;
  default_unit_hint: string | null;
  swatch_color: string | null;
  sort_order: number;
};

export const REFERENCE_CATEGORY_LABELS: Record<PackagingReferenceCategory, string> = {
  material: 'Materials',
  finish: 'Finishes',
  service_item: 'Service items',
};

/**
 * S27-STARK-E1 — Production-stage tracking (Phase E). Fixed 7-stage flow
 * covering both digital and flexo jobs, approved by Ritesh. Stored as an
 * append-only event log (packaging_production_stage_events); current stage
 * for a line is the most recent event.
 */
export type ProductionStage =
  | 'pre_press'
  | 'printing'
  | 'lamination_converting'
  | 'slitting_pouching'
  | 'qc'
  | 'packed'
  | 'dispatched';

export const PRODUCTION_STAGES: Array<{ key: ProductionStage; label: string }> = [
  { key: 'pre_press', label: 'Pre-Press' },
  { key: 'printing', label: 'Printing' },
  { key: 'lamination_converting', label: 'Lamination / Converting' },
  { key: 'slitting_pouching', label: 'Slitting / Pouching' },
  { key: 'qc', label: 'QC' },
  { key: 'packed', label: 'Packed' },
  { key: 'dispatched', label: 'Dispatched' },
];

export function productionStageLabel(stage: ProductionStage | null): string {
  if (!stage) return 'Not started';
  return PRODUCTION_STAGES.find((item) => item.key === stage)?.label ?? stage;
}

export function nextProductionStage(stage: ProductionStage | null): ProductionStage | null {
  if (!stage) return PRODUCTION_STAGES[0].key;
  const index = PRODUCTION_STAGES.findIndex((item) => item.key === stage);
  if (index === -1 || index === PRODUCTION_STAGES.length - 1) return null;
  return PRODUCTION_STAGES[index + 1].key;
}

export type ProductionStageEvent = {
  id: string;
  organization_id: string;
  quote_line_item_id: string;
  stage: ProductionStage;
  entered_at: string;
  actor_user_id: string | null;
  notes: string | null;
};
