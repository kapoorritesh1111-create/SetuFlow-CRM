export type PricingViewMode = "unit" | "case";
export type PricingBasis = "unit" | "case" | "kg" | null;

export type ProductsSpreadsheetRow = {
  sku_code: string | null;
  product_id: string;
  product_variant_id: string;
  product_name: string | null;
  category_name: string | null;
  brand_name: string | null;
  image_url?: string | null;
  pack_label: string | null;
  units_per_case: number | null;
  moq_value: number | null;
  moq_unit: string | null;
  moq_display: string | null;
  is_quoteable: boolean;
  ex_factory_value: number | null;
  ex_factory_unit: PricingBasis;
  ex_factory_display: string | null;
  ex_factory_per_unit_value: number | null;
  ex_factory_per_unit_display: string | null;
  ex_factory_per_case_value: number | null;
  ex_factory_per_case_display: string | null;
  fob_value: number | null;
  fob_unit: PricingBasis;
  fob_display: string | null;
  fob_per_unit_value: number | null;
  fob_per_unit_display: string | null;
  fob_per_case_value: number | null;
  fob_per_case_display: string | null;
  cif_value: number | null;
  cif_unit: string | null;
  cif_display: string | null;
  bulk_value: number | null;
  bulk_unit: PricingBasis;
  bulk_display: string | null;
  pricing_mode_default: PricingBasis;
  pricing_rule_set_id: string | null;
  pricing_rule_set_name: string | null;
  source_sheet_name: string | null;
  updated_at: string | null;
  is_active: boolean;
  pricing_snapshot?: ProductPricingSnapshot | null;
};

export type ProductsSpreadsheetSummary = {
  visible_products: number;
  visible_variants: number;
  priced_variants: number;
  quote_ready_variants: number;
  inactive_variants: number;
  categories_visible: number;
  has_pricing_rule_set: boolean;
  pricing_rule_set_name: string | null;
};

export type ProductsSpreadsheetResponse = {
  rows: ProductsSpreadsheetRow[];
  meta: { page: number; page_size: number; total_rows: number };
  summary?: ProductsSpreadsheetSummary;
  debug?: Record<string, unknown>;
};

export type ProductDetailVariant = {
  product_variant_id: string;
  sku_code: string | null;
  variant_name: string;
  pack_label: string | null;
  units_per_case: number | null;
  moq_cases?: number | null;
  moq_kg?: number | null;
  moq_display: string | null;
  is_quoteable: boolean;
  pricing_mode_default: PricingBasis;
  ex_factory_display: string | null;
  ex_factory_value: number | null;
  ex_factory_unit: PricingBasis;
  fob_display: string | null;
  fob_value: number | null;
  fob_unit: PricingBasis;
  cif_display: string | null;
  bulk_display: string | null;
  bulk_value: number | null;
  bulk_unit: PricingBasis;
  source_sheet_name: string | null;
  pricing_rule_id: string | null;
  effective_from: string | null;
};

export type ProductPricingSnapshot = {
  base_cost: number | null;
  exw_price: number | null;
  fob_price: number | null;
  cif_price: number | null;
  ddp_price: number | null;
  distributor_price: number | null;
  retail_price: number | null;
  pricing_currency: string | null;
  inland_transport_cost: number | null;
  export_customs_cost: number | null;
  port_handling_cost: number | null;
  freight_cost: number | null;
  insurance_cost: number | null;
  import_duty_percent: number | null;
  destination_charges: number | null;
  local_delivery_cost: number | null;
  internal_margin_percent?: number | null;
  internal_price?: number | null;
  distributor_margin_percent: number | null;
  retail_margin_percent: number | null;
  pricing_start_level:
    | "exw"
    | "fob"
    | "cif"
    | "ddp"
    | "distributor"
    | "retail"
    | null;
  pricing_margin_mode: "markup" | "margin" | null;
  pricing_last_calculated_at: string | null;
  product_variant_id?: string | null;
  pricing_mode_default?: PricingBasis;
  default_unit_of_measure?: string | null;
  pack_size?: string | number | null;
  pack_size_unit?: string | null;
};

export type ProductDetailResponse = {
  product: {
    id: string;
    name: string;
    category_name: string | null;
    brand_name: string | null;
    image_url?: string | null;
    pricing_type: string | null;
    description: string | null;
    is_active: boolean;
    pricing_snapshot?: ProductPricingSnapshot | null;
  };
  variants: ProductDetailVariant[];
  pricing_meta: {
    pricing_rule_set_id: string | null;
    pricing_rule_set_name: string | null;
    source_reference: string | null;
    last_imported_at: string | null;
  };
};

export type UpdateProductVariantPayload = {
  product_variant_id: string;
  variant_name?: string | null;
  sku_code?: string | null;
  pack_label?: string | null;
  units_per_case?: number | null;
  moq_cases?: number | null;
  moq_kg?: number | null;
  pricing_mode_default?: "unit" | "case" | "kg" | null;
  is_quoteable?: boolean;
  ex_factory_value?: number | null;
  ex_factory_unit?: "unit" | "case" | "kg" | null;
  fob_value?: number | null;
  fob_unit?: "unit" | "case" | "kg" | null;
  bulk_value?: number | null;
  cif_value?: number | null;
  cif_unit?: "unit" | "case" | null;
};

export type UpdateProductPayload = {
  name?: string;
  brand_name?: string | null;
  image_url?: string | null;
  description?: string | null;
  is_active?: boolean;
  variants?: UpdateProductVariantPayload[];
};

export type CreateProductPayload = {
  name: string;
  category_id: string;
  brand_name?: string | null;
  description?: string | null;
  pricing_type?: string | null;
  variant: {
    name?: string | null;
    sku_code: string;
    pack_label: string;
    pack_size_value?: number | null;
    pack_size_unit?: string | null;
    units_per_case?: number | null;
    moq_cases?: number | null;
    moq_kg?: number | null;
    pricing_mode_default?: "unit" | "case" | "kg" | null;
    supports_bulk_pricing?: boolean;
  };
  pricing?: {
    ex_factory_value?: number | null;
    ex_factory_unit?: "unit" | "case" | "kg" | null;
    fob_value?: number | null;
    fob_unit?: "unit" | "case" | "kg" | null;
    bulk_value?: number | null;
    source_sheet_name?: string | null;
  };
  pricing_snapshot?: ProductPricingSnapshot | null;
};
