export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type OrganizationRow = { id: string; name: string; slug: string; logo_url: string | null; created_by: string | null; created_at: string; updated_at: string; default_currency: string | null; approval_threshold_pct: number | null };
type ProfileRow = { id: string; username: string | null; full_name: string | null; email: string | null; avatar_url: string | null; created_at: string; updated_at: string };
type OrganizationMemberRow = { id: string; organization_id: string; user_id: string; is_active: boolean; created_at: string; updated_at: string };
type RoleRow = { id: string; organization_id: string | null; name: string; description: string | null; created_at: string; updated_at: string };
type UserRoleRow = { id: string; organization_member_id: string | null; role_id: string | null; assigned_at: string | null };
type MarketRow = { id: string; organization_id: string; name: string; market_code: string | null; is_active: boolean; sort_order: number; created_at: string; updated_at: string };
type CountryRow = { id: string; organization_id: string; market_id: string; name: string; iso2_code: string | null; iso3_code: string | null; phone_code: string | null; sort_order: number | null; is_active: boolean; created_at: string; updated_at: string; search_aliases: string | null };
type PipelineRow = { id: string; organization_id: string; name: string; lead_type: 'buyer' | 'supplier' | 'both'; is_default: boolean; created_at: string; updated_at: string };
type PipelineStageRow = { id: string; pipeline_id: string; name: string; sort_order: number; color: string | null; is_closed: boolean; is_won: boolean; is_lost: boolean; created_at: string; updated_at: string };
type NextStepRow = { id: string; organization_id: string; name: string; is_active: boolean; sort_order: number; created_at: string; updated_at: string };
type ProductCategoryRow = { id: string; organization_id: string; name: string; is_active: boolean; sort_order: number; parent_id: string | null; created_at: string; updated_at: string };
type ProductRow = { id: string; organization_id: string; category_id: string | null; name: string; sku: string | null; description: string | null; is_active: boolean; created_at: string; updated_at: string; sku_code: string | null; hsn_code: string | null; brand_name: string | null; pack_size: string | null; supplier_name: string | null; short_code: string | null };
type ProductVariantRow = { id: string; product_id: string; name: string; hs_code_id: string | null; created_at: string; organization_id: string | null; sku_code: string | null; pack_label: string | null; units_per_case: number | null; pricing_mode_default: 'unit' | 'case' | 'kg' | null; net_weight_kg: number | null; hsn_code: string | null; source_payload: Json | null; country_of_origin: string | null; export_metadata: Json | null; packaging_type: string | null; packaging_unit: string | null; shipment_notes: string | null; shipment_attributes: Json | null; is_quoteable: boolean | null; is_active: boolean | null; sort_order: number | null; };
type ProductPriceRow = { id: string; product_variant_id: string; market_id: string; price: number; currency: string; effective_from: string; effective_to: string | null; created_at: string };
type TradeEventRow = { id: string; organization_id: string; name: string; city: string | null; country: string | null; starts_on: string | null; ends_on: string | null; notes: string | null; created_at: string; updated_at: string };
type TradeEventEntryRow = { id: string; organization_id: string; trade_event_id: string; captured_company_name: string | null; captured_contact_name: string | null; captured_job_title: string | null; captured_email: string | null; captured_phone: string | null; captured_country: string | null; captured_notes: string | null; source_label: string | null; source_scan_ref: string | null; status: 'new' | 'qualified' | 'converted' | 'duplicate' | 'discarded'; duplicate_of_entry_id: string | null; converted_lead_id: string | null; assigned_user_id: string | null; normalized_payload: Json; raw_payload: Json; captured_at: string; qualified_at: string | null; converted_at: string | null; created_by: string | null; created_at: string; updated_at: string };
type CommunicationRow = { id: string; organization_id: string; lead_id: string | null; quote_id: string | null; rfq_id: string | null; related_entity: 'lead' | 'quote' | 'rfq' | 'trade_event_entry' | 'other'; related_id: string | null; communication_type: 'introduction' | 'follow_up' | 'quote_message' | 'compliance_request' | 'system_note' | 'other'; direction: 'inbound' | 'outbound' | 'internal'; channel: 'email' | 'phone' | 'whatsapp' | 'linkedin' | 'trade_show' | 'meeting' | 'system' | 'other'; subject: string | null; body: string | null; summary: string | null; draft_source: 'manual' | 'ai' | 'imported' | 'system'; status: 'draft' | 'approved' | 'sent' | 'received' | 'failed' | 'cancelled'; sent_at: string | null; scheduled_at: string | null; approved_at: string | null; approved_by: string | null; created_by: string | null; created_at: string; updated_at: string; provider_message_id: string | null; provider_payload: Json; metadata: Json };
type LeadRow = { id: string; organization_id: string; lead_type: 'buyer' | 'supplier'; owner_user_id: string | null; created_by: string | null; updated_by: string | null; company_name: string; contact_name: string | null; job_title: string | null; email: string | null; phone: string | null; phone_secondary: string | null; website: string | null; social_handle: string | null; country: string | null; private_label_mode: string | null; product_type: string | null; products_or_needs: string | null; ex_factory: string | null; fob: string | null; notes: string | null; deal_value: number | null; deal_currency: string | null; pipeline_id: string | null; stage_id: string | null; next_step_id: string | null; source_type: string | null; source_label: string | null; trade_event_id: string | null; intro_sent: boolean; last_contacted_at: string | null; next_follow_up_at: string | null; legacy_lead_id: string | null; created_at: string; updated_at: string; market_id: string | null; country_id: string | null; phone_country_code: string | null; phone_secondary_country_code: string | null };
type LeadMarketRow = { id: string; lead_id: string; market_id: string };
type LeadProductInterestRow = { id: string; lead_id: string; product_id: string; label: string | null; created_at: string; interest_type: 'category_only' | 'confirmed_product'; source_context: Json | null };
type LeadFollowUpRow = { id: string; organization_id: string; lead_id: string | null; assigned_user_id: string | null; scheduled_at: string | null; status: string; notes: string | null; completed_at: string | null; created_by: string | null; created_at: string; legacy_follow_up_id: string | null };
type LeadActivityRow = { id: string; organization_id: string; lead_id: string; actor_user_id: string | null; kind: string; message: string; occurred_at: string; created_at: string; legacy_activity_id: string | null };
type LeadStageHistoryRow = { id: string; organization_id: string; lead_id: string; from_stage_id: string | null; to_stage_id: string | null; changed_by: string | null; changed_at: string; note: string | null };
type AuditLogRow = { id: string; organization_id: string | null; actor_user_id: string | null; entity_type: string; entity_id: string | null; action: string; payload: Json | null; created_at: string };
type RfqRow = { id: string; organization_id: string; lead_id: string | null; created_by: string | null; status: string; validity_date: string | null; currency: string | null; notes: string | null; created_at: string | null; updated_at: string | null };
type RfqLineItemRow = { id: string; rfq_id: string | null; product_id: string | null; product_variant_id: string | null; catalog_price_id: string | null; catalog_price_amount: number | null; catalog_price_currency: string | null; quantity: number; unit_price: number | null; currency: string | null; is_price_overridden: boolean | null; override_reason: string | null; overridden_by: string | null; overridden_at: string | null; notes: string | null; created_at: string | null; updated_at: string | null };
type QuoteRow = { id: string; organization_id: string; lead_id: string; rfq_id: string | null; created_by: string | null; status: string; currency: string | null; notes: string | null; created_at: string; updated_at: string };
type QuoteLineItemRow = { id: string; quote_id: string; product_id: string | null; product_variant_id: string | null; catalog_price_id: string | null; catalog_price_amount: number | null; catalog_price_currency: string | null; quantity: number; unit_price: number | null; currency: string | null; is_price_overridden: boolean | null; override_reason: string | null; overridden_by: string | null; overridden_at: string | null; notes: string | null; created_at: string; updated_at: string };
type SavedViewRow = { id: string; organization_id: string; entity_type: string; name: string; description: string | null; visibility: 'private' | 'team' | 'org'; filter_model: Json; sort_model: Json | null; column_model: Json | null; created_by_membership_id: string; updated_by_membership_id: string | null; created_at: string; updated_at: string };
type ViewPreferenceRow = { id: string; organization_id: string; organization_member_id: string; entity_type: string; saved_view_id: string | null; built_in_view_key: string | null; created_at: string; updated_at: string };
type OrganizationInvitationRow = { id: string; organization_id: string; email: string; role_id: string | null; invited_by_membership_id: string; status: string; token_hash: string | null; expires_at: string | null; last_sent_at: string | null; accepted_at: string | null; revoked_at: string | null; metadata: Json; created_at: string; updated_at: string };

type MyCardSettingsRow = { id: string; user_id: string; organization_id: string | null; share_slug: string; primary_phone: string | null; secondary_phone: string | null; website: string | null; address: string | null; booking_url: string | null; quote_url: string | null; linkedin_url: string | null; instagram_url: string | null; facebook_url: string | null; tiktok_url: string | null; is_public: boolean; created_at: string; updated_at: string };

// --- Additional tables derived from the Supabase schema ---

/**
 * AI suggestions rows represent recommendations generated by AI for a given lead.
 * The structure is kept permissive (all columns optional) to avoid schema drift.
 */
type AiSuggestionRow = {
  id: string;
  organization_id: string | null;
  lead_id: string;
  suggestion_type: string;
  target_entity_type: string | null;
  target_entity_id: string | null;
  content: string;
  draft_subject: string | null;
  draft_body: string | null;
  rationale: string | null;
  prompt_context: Json | null;
  status: string;
  suggested_by: string | null;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_outcome: string | null;
  operator_notes: string | null;
  applied_communication_id: string | null;
  updated_at: string | null;
};

/** Compliance checklist item row for a particular country. */
type ComplianceChecklistItemRow = {
  id: string;
  country_id: string;
  code: string;
  description: string;
  is_mandatory: boolean;
  created_at: string;
};

/** Contract line item row representing a product within a contract. */
type ContractLineItemRow = {
  id: string;
  contract_id: string;
  product_id: string | null;
  product_variant_id: string | null;
  catalog_price_id: string | null;
  catalog_price_amount: number | null;
  catalog_price_currency: string | null;
  quantity: number;
  unit_price: number | null;
  currency: string | null;
  is_price_overridden: boolean | null;
  override_reason: string | null;
  overridden_by: string | null;
  overridden_at: string | null;
  source_quote_line_item_id: string | null;
  continuity_snapshot: Json;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/** Contract row capturing the relationship between an accepted quote and a lead. */
type ContractRow = {
  id: string;
  organization_id: string;
  quote_id: string;
  lead_id: string;
  status: string;
  signed_at: string | null;
  starts_on: string | null;
  ends_on: string | null;
  commercial_lock_state: string | null;
  quote_currency: string | null;
  pricing_basis: string | null;
  approval_required: boolean;
  approval_state: string;
  approved_at: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  locked_at: string | null;
  commercial_snapshot: Json;
  execution_state: string;
  execution_blockers: Json;
  execution_snapshot: Json;
  ready_at: string | null;
  released_at: string | null;
  dispatched_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};


/** Document requirement rules normalize required document expectations by market, product, lead type, and progression scope. */
type DocumentRequirementRuleRow = {
  id: string;
  organization_id: string;
  market_id: string | null;
  product_id: string | null;
  lead_type: string | null;
  progression_scope: string;
  requirement_code: string;
  title: string | null;
  doc_type: string | null;
  applies_to_entity: string;
  is_mandatory: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/** Document version row.  Each version points back to a document and has a file URL. */
type DocumentVersionRow = {
  id: string;
  document_id: string;
  version: number;
  file_url: string;
  created_at: string;
  created_by: string | null;
};

/** Document metadata row for uploaded files. */
type DocumentRow = {
  id: string;
  organization_id: string;
  related_entity: string;
  related_id: string;
  file_name: string;
  file_url: string;
  doc_type: string;
  uploaded_by: string | null;
  uploaded_at: string;
  version: number;
  status: string;
  owner_user_id: string | null;
  reviewer_user_id: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  expires_at: string | null;
  version_label: string | null;
  requirement_code: string | null;
};

/** Exchange rate row for currency conversion. */
type ExchangeRateRow = {
  id: string;
  base_currency: string;
  quote_currency: string;
  rate: number;
  provider: string;
  effective_at: string;
  fetched_at: string;
};

/** HS code row for customs classification. */
type HsCodeRow = {
  id: string;
  code: string;
  description: string;
  unit_measure: string | null;
  created_at: string;
};

/** HS duty row capturing duty rate per HS code and country. */
type HsDutyRow = {
  id: string;
  hs_code_id: string;
  country_id: string;
  duty_rate: number;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
};

/** Integration event row for logging integration payloads. */
type IntegrationEventRow = {
  id: string;
  integration_id: string;
  direction: string;
  event_type: string;
  payload: Json;
  status: string;
  created_at: string;
  processed_at: string | null;
};

/** Integration row representing an external provider connection. */
type IntegrationRow = {
  id: string;
  organization_id: string;
  provider: string;
  configuration: Json;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/** Lead assignment history row capturing changes of lead owner. */
type LeadAssignmentHistoryRow = {
  id: string;
  lead_id: string;
  from_user_id: string | null;
  to_user_id: string | null;
  changed_by: string | null;
  assigned_at: string;
  note: string | null;
};

/** Lead attachment row for files uploaded against a lead. */
type LeadAttachmentRow = {
  id: string;
  lead_id: string;
  document_id: string;
  uploaded_at: string;
};

/** Lead compliance item row tracking required compliance tasks per lead. */
type LeadComplianceItemRow = {
  id: string;
  organization_id: string | null;
  lead_id: string;
  compliance_item_id: string;
  document_id: string | null;
  status: string;
  created_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  reviewer_user_id: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  due_at: string | null;
  blocked_stage: string | null;
  severity: string | null;
};

/** Lead playbook run row representing execution of an automation sequence. */
type LeadPlaybookRunRow = {
  id: string;
  lead_id: string;
  playbook_name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  error: string | null;
};

/** Lead score row storing computed scoring metrics for a lead. */
type LeadScoreRow = {
  id: string;
  lead_id: string;
  score: number;
  created_at: string;
};

/** Lead tag row establishing many‑to‑many relationships between leads and tags. */
type LeadTagRow = {
  id: string;
  lead_id: string;
  tag_id: string;
};

/** Tag definition row for lead tags. */
type TagRow = {
  id: string;
  organization_id: string | null;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      organizations: Table<OrganizationRow>;
      profiles: Table<ProfileRow>;
      organization_members: Table<OrganizationMemberRow>;
      roles: Table<RoleRow>;
      user_roles: Table<UserRoleRow>;
      markets: Table<MarketRow>;
      countries: Table<CountryRow>;
      pipelines: Table<PipelineRow>;
      pipeline_stages: Table<PipelineStageRow>;
      next_steps: Table<NextStepRow>;
      product_categories: Table<ProductCategoryRow>;
      products: Table<ProductRow>;
      product_variants: Table<ProductVariantRow>;
      product_prices: Table<ProductPriceRow>;
      trade_events: Table<TradeEventRow>;
      trade_event_entries: Table<TradeEventEntryRow>;
      communications: Table<CommunicationRow>;
      leads: Table<LeadRow>;
      lead_markets: Table<LeadMarketRow>;
      lead_product_interests: Table<LeadProductInterestRow>;
      lead_follow_ups: Table<LeadFollowUpRow>;
      lead_activities: Table<LeadActivityRow>;
      lead_stage_history: Table<LeadStageHistoryRow>;
      audit_logs: Table<AuditLogRow>;
      rfqs: Table<RfqRow>;
      quotes: Table<QuoteRow>;
      rfq_line_items: Table<RfqLineItemRow>;
      quote_line_items: Table<QuoteLineItemRow>;
      saved_views: Table<SavedViewRow>;
      view_preferences: Table<ViewPreferenceRow>;
      organization_invitations: Table<OrganizationInvitationRow>;
      my_card_settings: Table<MyCardSettingsRow>;

      /**
       * AI suggestions linked to leads.  Each suggestion includes a type, content,
       * optional suggester/decider references, status, and timestamps.
       */
      ai_suggestions: Table<AiSuggestionRow>;
      /**
       * Compliance checklist items per country.  These capture regulatory codes
       * and descriptions for trade compliance tasks.
       */
      compliance_checklist_items: Table<ComplianceChecklistItemRow>;
      /**
       * Line items belonging to a contract.  Each row references a contract and
       * optionally a product with quantity and pricing information.
       */
      contract_line_items: Table<ContractLineItemRow>;
      /**
       * Contracts created from quotes.  A contract references a quote and lead
       * and includes status and lifecycle dates.
       */
      contracts: Table<ContractRow>;
      /**
       * Document versions track the history of uploaded files.  Each document
       * may have multiple versions distinguished by a sequential version number.
       */
      document_requirement_rules: Table<DocumentRequirementRuleRow>;
      document_versions: Table<DocumentVersionRow>;
      /**
       * Documents represent uploaded files tied to an entity such as a lead,
       * quote or contract.  Each document has a name, URL, type and status.
       */
      documents: Table<DocumentRow>;
      /**
       * Exchange rates are used for multi‑currency operations.  Each entry
       * stores a base and quote currency with an effective timestamp.
       */
      exchange_rates: Table<ExchangeRateRow>;
      /**
       * Harmonised System (HS) codes catalogue commodities for customs
       * classification.  Each code has a description and unit measure.
       */
      hs_codes: Table<HsCodeRow>;
      /**
       * Duty rates for HS codes by country.  Each row records a duty rate and
       * effective period for a given code and destination country.
       */
      hs_duties: Table<HsDutyRow>;
      /**
       * Integration events log inbound and outbound payloads for external
       * integrations (e.g. ERP, shipping providers).  They capture direction,
       * type, payload and processing status.
       */
      integration_events: Table<IntegrationEventRow>;
      /**
       * Integrations represent external systems connected to a workspace.  The
       * configuration field stores provider‑specific settings.
       */
      integrations: Table<IntegrationRow>;
      /**
       * Lead assignment history captures changes in lead ownership between
       * users, including who performed the change and when it occurred.
       */
      lead_assignment_history: Table<LeadAssignmentHistoryRow>;
      /**
       * Lead attachments store files associated with a lead.  Each attachment
       * references a file in storage and includes metadata about the upload.
       */
      lead_attachments: Table<LeadAttachmentRow>;
      /**
       * Lead compliance items track the completion status of required
       * compliance tasks per lead, such as document submissions.
       */
      lead_compliance_items: Table<LeadComplianceItemRow>;
      /**
       * Lead playbook runs represent executions of automated workflows (e.g.
       * nurturing sequences).  They record status and timestamps for each run.
       */
      lead_playbook_runs: Table<LeadPlaybookRunRow>;
      /**
       * Lead scores hold computed scores for leads based on activity and
       * engagement metrics.  Scores can be used for prioritisation and
       * automation.
       */
      lead_scores: Table<LeadScoreRow>;
      /**
       * Lead tags allow free‑form labelling of leads.  They support many‑to‑many
       * relationships between leads and tags via a pivot table (not defined here).
       */
      lead_tags: Table<LeadTagRow>;
      /**
       * Tags hold the definitions for lead tags.  They enable categorisation
       * beyond pipelines and stages.
       */
      tags: Table<TagRow>;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    // The `lead_type` enum represents the type of lead.  Some tables (e.g. `pipelines`)
    // permit a value of 'both' to indicate the pipeline supports both buyers and suppliers.
    // Include 'both' in the union here so the generated Database types do not reject
    // such rows at compile time.
    Enums: { lead_type: 'buyer' | 'supplier' | 'both' };
    CompositeTypes: { [_ in never]: never };
  };
};
