-- V17.5 pricing calculator alignment.
-- Keeps default pricing rules focused on shared calculator assumptions.
-- Product UOM, pack size, pack unit, and pricing basis stay on products/variants.

alter table if exists public.pricing_calculator_default_rules
  add column if not exists internal_margin_percent numeric null;

comment on table public.pricing_calculator_default_rules is
  'Organization/category calculator defaults for shared costs, duties, currency, margin mode, internal markup, distributor margin, and retail margin. Product UOM/pack size/pricing basis are stored on products/variants, not default rules.';

comment on column public.pricing_calculator_default_rules.internal_margin_percent is
  'Seller internal markup or margin applied after DDP/last calculated landed base and before distributor/retail margins.';
