export const PACKAGING_PRICING_ENGINE_VERSION = 4 as const;

export type PricingMasterRate = {
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

export type PricingCharge = {
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

export type ProductVariation = {
  id: string;
  variation_key: string;
  name: string;
  capacity_label: string | null;
  width_mm: number;
  height_mm: number;
  bottom_gusset_each_mm: number;
  dimension_label: string | null;
};

export type RecipeItem = {
  id: string;
  construction_key: string;
  role_key: string;
  source_type: 'cost_master' | 'charge_master';
  cost_master_item_id: string | null;
  charge_master_item_id: string | null;
  consumption_rule_json: Record<string, unknown>;
  condition_json: Record<string, unknown>;
  sort_order: number;
  is_required: boolean;
};

export type CommercialBand = {
  run_length_max_m: number;
  wastage_pct: number;
  margin_per_frame: number;
  sort_order: number;
};

export type MatrixRow = {
  id: string;
  supply_form: 'center_seal' | 'three_side_seal_roll' | 'three_side_seal_pouch';
  construction_key: string;
  client_product_id: string;
  width_mm: number | null;
  height_mm: number | null;
  q1_rate_per_frame: number | null;
  q2_rate_per_frame: number | null;
  q3_rate_per_frame: number | null;
  q4_rate_per_frame: number | null;
  q5_rate_per_frame: number | null;
  source_worksheet: string | null;
  source_row_number: number | null;
  source_reference: string | null;
  metadata?: Record<string, unknown>;
};

export type PackagingPricingTemplateV4 = {
  id: string;
  family_id: string;
  name: string;
  currency: string;
  calculation_version: number;
  calculation_engine_key: 'sup_formula' | 'matrix_per_frame' | 'service_formula';
  status: 'draft' | 'published' | 'archived';
  production_rules_json: Record<string, any>;
  quote_config_json: Record<string, any>;
};

export type SupPricingInput = {
  product_variation_id: string;
  construction_key: 'glossy_foil' | 'matte_foil' | 'glossy_clear_window' | 'matte_frosted_window';
  print: 'CMYK' | 'CMYKW';
  quantity: number;
  selected_charge_codes?: string[];
  kld_file_id?: string | null;
};

export type MatrixTier = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5';
export type MatrixPricingInput = {
  width_mm: number;
  height_mm: number;
  supply_form: MatrixRow['supply_form'];
  client_product_id: string;
  tier: MatrixTier;
  quantity?: number;
  selected_charge_codes?: string[];
  kld_file_id?: string | null;
};

export type AdminCostLine = {
  master_id: string;
  code: string;
  name: string;
  basis: string;
  snapshotted_rate: number;
  rate_uom: string;
  amount_per_frame: number;
  usage?: number;
  usage_uom?: string;
};

export type SeparateChargeLine = {
  master_id: string;
  code: string;
  name: string;
  category: PricingCharge['category'];
  basis: NonNullable<PricingCharge['basis']>;
  rate: number;
  amount: number;
};

export type PackagingPricingResult = {
  ok: boolean;
  engine_version: 4;
  family_id: string;
  template_id: string;
  template_version: number;
  customer_requirement: Record<string, unknown>;
  production_calculation: Record<string, unknown>;
  cost_build?: {
    admin_only: true;
    materials: AdminCostLine[];
    processes: AdminCostLine[];
    production_extras: AdminCostLine[];
    material_total_per_frame: number;
    process_total_per_frame: number;
    pre_commercial_cogs_per_frame: number;
  };
  commercial_rules: Record<string, unknown>;
  selling_price: {
    unit_price: number;
    product_total: number;
    currency: string;
    gst_pct: number;
    gst: number;
    grand_total_before_freight: number;
  };
  separate_charges: SeparateChargeLine[];
  kld: { file_id: string | null };
  source_hash: string;
  validation_errors: string[];
  warnings: string[];
};

export type PricingContext = {
  template: PackagingPricingTemplateV4;
  masters: PricingMasterRate[];
  charges: PricingCharge[];
  recipes: RecipeItem[];
  bands: CommercialBand[];
  variations: ProductVariation[];
  matrixRows: MatrixRow[];
};
