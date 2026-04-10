-- Phase 1: pricing SSOT notes and legacy lead-field deprecation markers
-- Purpose:
--   1) mark product_pricing_rules + pricing_rule_sets as the intended pricing SSOT
--   2) mark legacy lead pricing fields as deprecated without dropping data yet

comment on table public.pricing_rule_sets is 'SSOT pricing header for commercial pricing logic. Use with product_pricing_rules as the authoritative pricing source.';
comment on table public.product_pricing_rules is 'SSOT pricing detail table. New runtime pricing logic should resolve prices from this table, not product_prices.';
comment on table public.product_prices is 'Compatibility table only. Do not treat as the primary source of truth for new pricing workflows.';

comment on column public.leads.ex_factory is 'Deprecated legacy capture field. Do not use as pricing truth after Phase 1.';
comment on column public.leads.fob is 'Deprecated legacy capture field. Do not use as pricing truth after Phase 1.';
comment on column public.leads.products_or_needs is 'Legacy free-text capture field. Product mapping should move to structured lead_product_interests / RFQ / Quote flows.';

create or replace view public.active_product_pricing_rules_v as
select ppr.*
from public.product_pricing_rules ppr
where ppr.is_active = true
  and ppr.is_quoteable = true
  and (ppr.effective_to is null or ppr.effective_to >= current_date)
  and ppr.effective_from <= current_date;

comment on view public.active_product_pricing_rules_v is 'Convenience compatibility view exposing active quoteable pricing-rule rows from the pricing SSOT.';
