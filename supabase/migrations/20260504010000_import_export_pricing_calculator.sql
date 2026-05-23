-- Additive product-level pricing calculator fields for import/export hierarchy support.
-- Existing product_pricing_rules and quote pricing tables remain the commercial SSOT until quote integration is explicitly validated.

alter table public.products
  add column if not exists base_cost numeric,
  add column if not exists exw_price numeric,
  add column if not exists fob_price numeric,
  add column if not exists cif_price numeric,
  add column if not exists ddp_price numeric,
  add column if not exists distributor_price numeric,
  add column if not exists retail_price numeric,
  add column if not exists pricing_currency text default 'USD',
  add column if not exists inland_transport_cost numeric,
  add column if not exists export_customs_cost numeric,
  add column if not exists port_handling_cost numeric,
  add column if not exists freight_cost numeric,
  add column if not exists insurance_cost numeric,
  add column if not exists import_duty_percent numeric,
  add column if not exists destination_charges numeric,
  add column if not exists local_delivery_cost numeric,
  add column if not exists distributor_margin_percent numeric,
  add column if not exists retail_margin_percent numeric,
  add column if not exists pricing_start_level text,
  add column if not exists pricing_margin_mode text,
  add column if not exists pricing_last_calculated_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_pricing_start_level_check') then
    alter table public.products add constraint products_pricing_start_level_check
      check (pricing_start_level is null or pricing_start_level in ('exw','fob','cif','ddp','distributor','retail'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_pricing_margin_mode_check') then
    alter table public.products add constraint products_pricing_margin_mode_check
      check (pricing_margin_mode is null or pricing_margin_mode in ('markup','margin'));
  end if;
end $$;

comment on column public.products.exw_price is 'Product-level calculator snapshot. Quote pricing rules remain authoritative until quote integration is validated.';
comment on column public.products.fob_price is 'Product-level calculator snapshot. Quote pricing rules remain authoritative until quote integration is validated.';
comment on column public.products.cif_price is 'Product-level calculator snapshot. Quote pricing rules remain authoritative until quote integration is validated.';
comment on column public.products.ddp_price is 'Product-level calculator snapshot. Quote pricing rules remain authoritative until quote integration is validated.';
comment on column public.products.distributor_price is 'Product-level calculator snapshot. Quote pricing rules remain authoritative until quote integration is validated.';
comment on column public.products.retail_price is 'Product-level calculator snapshot. Quote pricing rules remain authoritative until quote integration is validated.';
