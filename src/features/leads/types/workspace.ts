import type { TodayLayerState, WorkspaceMode } from '@/features/workspace/types';
import type { LeadJourney } from '@/lib/journey';

export type LeadRow = {
  id: string;
  company_name: string;
  contact_name: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  phone_secondary: string | null;
  website: string | null;
  social_handle: string | null;
  lead_type: 'buyer' | 'supplier';
  country: string | null;
  country_id: string | null;
  source_type: string | null;
  source_label: string | null;
  next_follow_up_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_contacted_at: string | null;
  stage_id: string | null;
  next_step_id: string | null;
  owner_user_id: string | null;
  trade_event_id: string | null;
  notes: string | null;
  pipeline_id: string | null;
  intro_sent: boolean;
  deal_value: number | null;
  deal_currency: string | null;
  phone_country_code: string | null;
  phone_secondary_country_code: string | null;
};

export type Option = { id: string; name: string };
export type ProductCategory = { id: string; name: string; is_active?: boolean; sort_order?: number; parent_id?: string | null };
export type Product = { id: string; name: string; sku: string | null; category_id: string | null };
export type Profile = { id: string; full_name: string | null; username: string | null };
export type Country = { id: string; name: string; phone_code: string | null; market_id: string | null };
export type Market = { id: string; name: string };
export type Stage = { id: string; name: string; pipeline_id: string; sort_order: number; is_closed?: boolean; is_won?: boolean; is_lost?: boolean };
export type Pipeline = { id: string; name: string; lead_type: 'buyer' | 'supplier' | 'both'; is_default: boolean };
export type FollowUp = { id: string; lead_id: string | null; scheduled_at: string | null; status: string; created_at?: string | null; completed_at?: string | null; notes?: string | null };
export type Activity = { id: string; lead_id: string; kind: string; message: string; occurred_at: string };
export type StageHistory = { id: string; lead_id?: string; from_stage_id: string | null; to_stage_id: string | null; changed_at: string; note: string | null };
export type RfqLineItem = { id: string; rfq_id: string | null; product_id: string | null; product_variant_id?: string | null; catalog_price_id?: string | null; catalog_price_amount?: number | null; catalog_price_currency?: string | null; quantity?: number | null; unit_price?: number | null; currency?: string | null; is_price_overridden?: boolean | null; override_reason?: string | null; overridden_by?: string | null; overridden_at?: string | null; notes?: string | null };
export type QuoteLineItem = { id: string; quote_id: string | null; product_id: string | null; product_variant_id?: string | null; catalog_price_id?: string | null; catalog_price_amount?: number | null; catalog_price_currency?: string | null; quantity?: number | null; unit_price?: number | null; currency?: string | null; is_price_overridden?: boolean | null; override_reason?: string | null; overridden_by?: string | null; overridden_at?: string | null; notes?: string | null };
export type Rfq = { id: string; lead_id: string | null; status: string; currency: string | null; validity_date: string | null; created_at: string | null; updated_at: string | null; notes?: string | null; lineItems?: RfqLineItem[] };
export type Quote = { id: string; lead_id: string; rfq_id: string | null; status: string; currency: string | null; created_at: string; updated_at: string; notes?: string | null; quote_number?: string | null; current_version_id?: string | null; lineItems?: QuoteLineItem[] };
export type QuoteVersion = { id: string; quote_id: string | null; version_no?: number | null; status?: string | null; created_at?: string | null; approved_at?: string | null; sent_at?: string | null; pdf_document_id?: string | null };
export type ComplianceItem = { id: string; lead_id: string; compliance_item_id: string; status: string; created_at: string; submitted_at: string | null; approved_at: string | null };
export type ComplianceDefinition = { id: string; code: string; description: string };
export type LeadDocument = { id: string; related_entity?: string | null; related_id?: string | null; requirement_code: string | null; status: string | null; expires_at: string | null; uploaded_at?: string | null; doc_type?: string | null; file_name?: string | null; linked_quote_id?: string | null; source_related_entity?: string | null; review_notes?: string | null };
export type Variant = { id: string; name: string; product_id: string };
export type Price = { id: string; product_variant_id: string; market_id: string | null; price: number; currency: string; effective_from: string; effective_to: string | null };
export type PricingRule = { id: string; product_id?: string | null; product_variant_id?: string | null; effective_from?: string | null; effective_to?: string | null; ex_factory_usd?: number | null; fob_usd?: number | null; ex_factory_inr?: number | null; fob_inr?: number | null; ex_factory_usd_per_case?: number | null; ex_factory_usd_per_unit?: number | null; fob_usd_per_case?: number | null; fob_usd_per_unit?: number | null; bulk_usd_per_kg?: number | null; pricing_type?: string | null; product_name?: string | null; sku_code?: string | null };

export type LeadOpenStep = 'basics' | 'workflow' | 'coverage' | 'quotes';
export type LeadWizardStepId = LeadOpenStep;

export type LeadQuickCapturePrefill = {
  sourceType?: string;
  sourceLabel?: string;
  selectedProductIds?: string[];
  autoOpenQuoteAfterSave?: boolean;
  title?: string;
  description?: string;
};

export type LeadsWorkspaceProps = {
  currentUserId: string;
  canManageLeads?: boolean;
  readOnlyMessage?: string | null;
  isWorkspaceEmpty?: boolean;
  leads: LeadRow[];
  stages: Stage[];
  pipelines: Pipeline[];
  nextSteps: Option[];
  tradeEvents: Option[];
  productCategories: ProductCategory[];
  products: Product[];
  markets: Option[];
  profiles: Profile[];
  countries: Country[];
  leadMarkets: Array<{ lead_id: string; market_id: string }>;
  leadProductInterests: Array<{ lead_id: string; product_id: string }>;
  followUps: FollowUp[];
  activities: Activity[];
  stageHistory?: StageHistory[];
  rfqs?: Rfq[];
  quotes?: Quote[];
  quoteVersions?: QuoteVersion[];
  complianceItems?: ComplianceItem[];
  complianceDefinitions?: ComplianceDefinition[];
  documents?: LeadDocument[];
  documentRequirementRules?: import('@/lib/document-requirements').DocumentRequirementRule[];
  variants?: Variant[];
  prices?: Price[];
  pricingRules?: PricingRule[];
  initialLeadType?: '' | LeadJourney;
  initialMode?: WorkspaceMode;
  initialTodayState?: TodayLayerState;
  storageKey?: string;
  initialQuickCapture?: LeadQuickCapturePrefill | null;
  initialEventId?: string | null;
  initialFastField?: boolean;
};

export type LeadDrawerLead = Pick<LeadRow,
  'id' | 'company_name' | 'contact_name' | 'job_title' | 'email' | 'phone' | 'phone_secondary' |
  'lead_type' | 'country' | 'country_id' | 'source_type' | 'source_label' | 'next_follow_up_at' |
  'created_at' | 'updated_at' | 'last_contacted_at' | 'stage_id' | 'next_step_id' | 'owner_user_id' |
  'trade_event_id' | 'notes' | 'website' | 'social_handle' | 'deal_value' | 'deal_currency' |
  'pipeline_id' | 'intro_sent' | 'phone_country_code' | 'phone_secondary_country_code'
>;

export type LeadDrawerSavePayload = {
  resetForNextLead: boolean;
  lead?: LeadDrawerLead;
  selectedMarketIds?: string[];
  selectedProductIds?: string[];
};

export type LeadDrawerProps = {
  lead?: LeadDrawerLead;
  stages: Stage[];
  pipelines: Pipeline[];
  nextSteps: Option[];
  tradeEvents: Option[];
  productCategories?: ProductCategory[];
  products: Product[];
  markets: Market[];
  variants?: Variant[];
  prices?: Price[];
  pricingRules?: PricingRule[];
  profiles: Profile[];
  countries: Country[];
  followUps?: FollowUp[];
  activities?: Activity[];
  stageHistory?: StageHistory[];
  rfqs?: Rfq[];
  quotes?: Quote[];
  quoteVersions?: QuoteVersion[];
  documents?: LeadDocument[];
  complianceItems?: ComplianceItem[];
  complianceDefinitions?: ComplianceDefinition[];
  selectedMarketIds?: string[];
  selectedProductIds?: string[];
  currentUserId?: string;
  open?: boolean;
  onClose?: () => void;
  onSaved?: (result: LeadDrawerSavePayload) => void;
  onOpenInlineQuote?: (leadId: string, quoteId?: string | null) => void;
  mode?: 'quick' | 'full';
  title?: string;
  canNavigatePrev?: boolean;
  canNavigateNext?: boolean;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  navigationMeta?: string;
  initialStepId?: LeadWizardStepId;
  prefill?: LeadQuickCapturePrefill | null;
  fastFieldMode?: boolean;
};
