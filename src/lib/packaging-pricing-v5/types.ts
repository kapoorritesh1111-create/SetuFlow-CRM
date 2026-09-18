export const PACKAGING_PRICING_ENGINE_VERSION_V5 = 5 as const;

export type PricingBucketV5 = 1 | 2 | 3 | 4 | 5;
export type GussetProductionModeV5 = 'integrated' | 'separate' | 'conditional';
export type BottomRegistrationModeV5 = 'not_applicable' | 'optional' | 'required_registered' | 'required_unregistered';
export type BottomPrintModeV5 = 'solid_unregistered' | 'registered_artwork';

export type SizeProfileV5 = {
  id: string;
  organization_id: string;
  family_id: string;
  size_key: string;
  name: string;
  width_mm: number;
  height_mm: number;
  bottom_gusset_each_mm: number;
  pricing_bucket: PricingBucketV5;
  production_profile_key: string | null;
  gusset_production_mode: GussetProductionModeV5;
  bottom_registration_mode: BottomRegistrationModeV5;
  is_active: boolean;
  is_quoteable: boolean;
  sort_order: number;
  metadata?: Record<string, unknown>;
};

export type ConstructionV5 = {
  id: string;
  organization_id: string;
  family_id: string;
  construction_key: string;
  construction_family_key: string;
  name: string;
  finish_type: string | null;
  barrier_type: string | null;
  sealant_code: string;
  layer_count: number;
  is_active: boolean;
  is_quoteable: boolean;
  sort_order: number;
  metadata?: Record<string, unknown>;
};

export type ConstructionLayerV5 = {
  id: string;
  construction_id: string;
  layer_position: number;
  role_key: string;
  cost_master_item_id: string;
  is_print_layer: boolean;
  is_sealant_layer: boolean;
};

export type CostMasterRateV5 = {
  id: string;
  code: string;
  name: string;
  item_type: 'material' | 'process';
  rate_basis: 'per_kg' | 'per_running_metre' | 'per_frame' | 'per_unit' | 'flat';
  current_rate: number | null;
  rate_uom: string;
  currency: string;
  micron: number | null;
  gsm: number | null;
  density: number | null;
  metadata?: Record<string, unknown>;
};

export type ChargeMasterRateV5 = {
  id: string;
  code: string;
  name: string;
  category: 'extra' | 'pre' | 'post';
  basis: 'per_unit' | 'per_running_metre' | 'per_frame' | 'flat' | 'percent' | null;
  application_stage: 'before_wastage_margin' | 'after_core_price' | 'separate_quote_line' | null;
  current_rate: number | null;
  currency: string;
  metadata?: Record<string, unknown>;
};

export type CommercialBandV5 = {
  id?: string;
  pricing_bucket: PricingBucketV5;
  run_length_max_m: number;
  wastage_pct: number;
  margin_per_frame: number;
  sort_order: number;
};

export type PricingTemplateV5 = {
  id: string;
  family_id: string;
  name: string;
  currency: string;
  calculation_version: 5;
  calculation_engine_key: 'sup_formula_v5' | 'frame_formula_v5';
  status: 'draft' | 'published' | 'archived';
  production_rules_json: Record<string, any>;
  quote_config_json: Record<string, any>;
};

export type ManualQuoteChargeV5 = {
  code: 'EXTRA_SPOT_UV';
  amount: number;
  note?: string;
};

export type SupPricingInputV5 = {
  size_profile_id: string;
  construction_id: string;
  print: 'CMYK' | 'CMYKW';
  quantity: number;
  bottom_print_mode?: BottomPrintModeV5;
  selected_charge_codes?: string[];
  manual_quote_charges?: ManualQuoteChargeV5[];
  kld_file_id?: string | null;
};

export type ProductionComponentV5 = {
  key: 'main_body' | 'bottom_gusset';
  description: string;
  web_width_mm: number;
  web_run_mm_per_frame: number;
  lanes_across: number;
  repeats_along: number;
  units_per_frame: number;
  frames_exact: number;
  run_length_m: number;
  apply_printing: boolean;
  apply_lamination: boolean;
  apply_slitting: boolean;
  apply_pouching: boolean;
  apply_zipper: boolean;
  commercial_band_source: 'self' | 'parent';
  apply_wastage: boolean;
  apply_margin: boolean;
};

export type AlternativePriceV5 = {
  quantity: number;
  unit_price: number;
  product_total: number;
  run_length_m: number;
  wastage_pct: number;
  margin_per_frame: number;
};

export type PricingCostBreakdownValuesV5 = {
  material_cost: number;
  printing_cost: number;
  lamination_cost: number;
  slitting_cost: number;
  pouch_making_cost: number;
  zipper_cost: number;
  other_process_cost: number;
  base_production_cost: number;
  waste_cost: number;
  margin_cost: number;
  additional_charges_cost: number;
  final_price: number;
};

export type PricingCostBreakdownV5 = {
  currency: string;
  per_unit: PricingCostBreakdownValuesV5;
  totals_for_job: PricingCostBreakdownValuesV5;
  reconciliation_delta: number;
};

export type PricingContextV5 = {
  template: PricingTemplateV5;
  sizeProfiles: SizeProfileV5[];
  constructions: ConstructionV5[];
  constructionLayers: ConstructionLayerV5[];
  masters: CostMasterRateV5[];
  charges?: ChargeMasterRateV5[];
  bands: CommercialBandV5[];
};

export type PackagingPricingResultV5 = {
  ok: boolean;
  engine_version: 5;
  family_id: string;
  template_id: string;
  template_version: 5;
  customer_requirement: Record<string, unknown>;
  construction: {
    id: string;
    name: string;
    layer_count: number;
    structure_label: string;
  } | null;
  production_route: {
    route_type: GussetProductionModeV5 | null;
    pricing_bucket: PricingBucketV5 | null;
    components: ProductionComponentV5[];
  };
  commercial_rules: {
    bucket_no: PricingBucketV5 | null;
    run_length_m: number;
    band_max_m: number | null;
    wastage_pct: number;
    margin_per_frame: number;
  };
  applied_charges: Array<{
    code: string;
    name: string;
    application_stage: string;
    amount: number;
  }>;
  cost_breakdown: PricingCostBreakdownV5;
  selling_price: {
    unit_price: number;
    product_total: number;
    currency: string;
    gst_pct: number;
    gst: number;
    grand_total_before_freight: number;
  };
  alternative_quantities: AlternativePriceV5[];
  source_hash: string;
  validation_errors: string[];
  warnings: string[];
};
