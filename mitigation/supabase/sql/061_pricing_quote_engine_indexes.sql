-- 061_pricing_quote_engine_indexes.sql
-- Purpose: add the operational indexes and uniqueness guarantees required by
-- pricing compile, version traversal, template lookup, and freight lookup.

begin;

create unique index if not exists uq_quotes_org_quote_number
  on public.quotes (organization_id, quote_number)
  where quote_number is not null;

create index if not exists idx_quotes_lead_status_created
  on public.quotes (lead_id, status, created_at desc);

create index if not exists idx_quotes_rfq_status_created
  on public.quotes (rfq_id, status, created_at desc)
  where rfq_id is not null;

create index if not exists idx_quotes_market_country_port
  on public.quotes (organization_id, market_id, country_id, destination_port);

create index if not exists idx_quotes_current_version_id
  on public.quotes (current_version_id)
  where current_version_id is not null;

create unique index if not exists uq_quote_versions_quote_version_no
  on public.quote_versions (quote_id, version_no);

create index if not exists idx_quote_versions_quote_status_created
  on public.quote_versions (quote_id, status, created_at desc);

create index if not exists idx_quote_versions_sent_at
  on public.quote_versions (sent_at desc)
  where sent_at is not null;

create unique index if not exists uq_quote_pricing_snapshots_quote_version
  on public.quote_pricing_snapshots (quote_version_id);

create index if not exists idx_quote_pricing_snapshots_rule_set_profile
  on public.quote_pricing_snapshots (pricing_rule_set_id, freight_profile_id);

create index if not exists idx_quote_version_line_items_version_sort
  on public.quote_version_line_items (quote_version_id, sort_order, category_type);

create index if not exists idx_quote_version_line_items_product_variant
  on public.quote_version_line_items (product_id, product_variant_id);

create index if not exists idx_quote_negotiation_events_quote_created
  on public.quote_negotiation_events (quote_id, created_at desc);

create index if not exists idx_quote_negotiation_events_version_created
  on public.quote_negotiation_events (quote_version_id, created_at desc)
  where quote_version_id is not null;

create index if not exists idx_pricing_rule_sets_org_status_default
  on public.pricing_rule_sets (organization_id, status, is_default, created_at desc);

create index if not exists idx_product_pricing_rules_rule_set_category_active
  on public.product_pricing_rules (
    pricing_rule_set_id,
    category_type,
    is_active,
    is_quoteable,
    sort_order
  );

create index if not exists idx_product_pricing_rules_product_variant_window
  on public.product_pricing_rules (
    product_id,
    product_variant_id,
    effective_from,
    effective_to
  );

create index if not exists idx_product_pricing_rules_sku_code
  on public.product_pricing_rules (sku_code);

create index if not exists idx_freight_profiles_lookup
  on public.freight_profiles (
    organization_id,
    market_id,
    country_id,
    destination_port,
    status
  );

create index if not exists idx_freight_profile_items_profile_line
  on public.freight_profile_items (freight_profile_id, is_active, line_no);

create unique index if not exists uq_freight_calc_assumptions_profile
  on public.freight_calc_assumptions (freight_profile_id);

create index if not exists idx_quote_templates_lookup
  on public.quote_templates (organization_id, template_type, is_active, is_default);

create unique index if not exists uq_quote_templates_org_type_default
  on public.quote_templates (organization_id, template_type)
  where is_default is true;

create unique index if not exists uq_pricing_engine_settings_org
  on public.pricing_engine_settings (organization_id);

commit;
