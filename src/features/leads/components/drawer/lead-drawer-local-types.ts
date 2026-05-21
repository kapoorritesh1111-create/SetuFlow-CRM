import type { Database } from "@/types/database";
import type { ContactAfterSaveGuidanceResult } from "@/lib/contact-exchange/contact-after-save-guidance";

export type LeadFormState = {
  error?: string;
  success?: string;
  lead?: LeadDrawerLead;
  selectedMarketIds?: string[];
  selectedProductIds?: string[];
};
export type Stage = {
  id: string;
  name: string;
  pipeline_id: string;
  sort_order?: number;
};
export type Pipeline = {
  id: string;
  name: string;
  lead_type: "buyer" | "supplier" | "both";
  is_default: boolean;
};
export type Option = { id: string; name: string };
export type Product = {
  id: string;
  name: string;
  sku: string | null;
  category_id: string | null;
};
export type Variant = { id: string; name: string; product_id: string; sku_code?: string | null; pack_label?: string | null; pack_size_value?: number | null; pack_size_unit?: string | null; units_per_case?: number | null; moq_cases?: number | null; moq_kg?: number | null; pricing_mode_default?: string | null };
export type Price = {
  id: string;
  product_variant_id: string;
  market_id: string | null;
  price: number;
  currency: string;
  effective_from: string;
  effective_to: string | null;
};
export type PricingRule = {
  id: string;
  product_id?: string | null;
  product_variant_id?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  ex_factory_usd?: number | null;
  fob_usd?: number | null;
  ex_factory_inr?: number | null;
  fob_inr?: number | null;
  ex_factory_usd_per_case?: number | null;
  ex_factory_usd_per_unit?: number | null;
  fob_usd_per_case?: number | null;
  fob_usd_per_unit?: number | null;
  bulk_usd_per_kg?: number | null;
  pricing_type?: string | null;
};
export type ProductCategory = {
  id: string;
  name: string;
  is_active?: boolean;
  sort_order?: number;
  parent_id?: string | null;
};
export type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
};
export type Country = {
  id: string;
  name: string;
  phone_code: string | null;
  market_id: string | null;
};
export type Market = { id: string; name: string };
export type FollowUp = {
  id: string;
  lead_id: string | null;
  scheduled_at: string | null;
  status: string;
  created_at?: string | null;
  completed_at?: string | null;
  notes?: string | null;
};
export type Activity = {
  id: string;
  lead_id: string;
  kind: string;
  message: string;
  occurred_at: string;
};
export type StageHistory = {
  id: string;
  from_stage_id: string | null;
  to_stage_id: string | null;
  changed_at: string;
  note: string | null;
};
export type Rfq = {
  id: string;
  lead_id: string | null;
  status: string;
  currency: string | null;
  validity_date: string | null;
  created_at: string | null;
  updated_at: string | null;
};
export type QuoteLineItem = {
  id: string;
  quote_id: string | null;
  product_id: string | null;
  product_variant_id?: string | null;
  catalog_price_id?: string | null;
  catalog_price_amount?: number | null;
  catalog_price_currency?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  currency?: string | null;
  is_price_overridden?: boolean | null;
  override_reason?: string | null;
  overridden_by?: string | null;
  overridden_at?: string | null;
  notes?: string | null;
};
export type Quote = {
  id: string;
  lead_id: string;
  rfq_id: string | null;
  status: string;
  currency: string | null;
  created_at: string;
  updated_at: string;
  notes?: string | null;
  quote_number?: string | null;
  current_version_id?: string | null;
  lineItems?: QuoteLineItem[];
};
export type ComplianceItem = {
  id: string;
  lead_id: string;
  compliance_item_id: string;
  status: string;
  created_at: string;
  submitted_at: string | null;
  approved_at: string | null;
};
export type ComplianceDefinition = { id: string; code: string; description: string };
export type QuoteVersion = {
  id: string;
  quote_id: string | null;
  version_no?: number | null;
  status?: string | null;
  created_at?: string | null;
  approved_at?: string | null;
  sent_at?: string | null;
  pdf_document_id?: string | null;
};
export type LeadDocument = {
  id: string;
  related_entity?: string | null;
  related_id?: string | null;
  requirement_code: string | null;
  status: string | null;
  expires_at: string | null;
  uploaded_at?: string | null;
  doc_type?: string | null;
  file_name?: string | null;
  linked_quote_id?: string | null;
  source_related_entity?: string | null;
  review_notes?: string | null;
};
export type CoverageSelection = {
  key: string;
  categoryId: string;
  productIds: string[];
};

export type QuickScanDraft = {
  contactName?: string | null;
  companyName?: string | null;
  jobTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  phoneSecondary?: string | null;
  website?: string | null;
  notes?: string | null;
};

export type QuickInterestMode = "product" | "category" | "new_request";

export type SpeechRecognitionCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop?: () => void;
};
