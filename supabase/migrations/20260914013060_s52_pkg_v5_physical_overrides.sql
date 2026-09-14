-- S52-PKG-V5-001C
-- Keep workbook-specific physical properties isolated from shared v4 Cost Master rows.
begin;

alter table public.packaging_pricing_cost_rates_v5
  add column if not exists micron_override numeric,
  add column if not exists gsm_override numeric,
  add column if not exists density_override numeric;

alter table public.packaging_pricing_cost_rates_v5
  drop constraint if exists packaging_pricing_cost_rates_v5_micron_override_check,
  add constraint packaging_pricing_cost_rates_v5_micron_override_check check (micron_override is null or micron_override > 0),
  drop constraint if exists packaging_pricing_cost_rates_v5_gsm_override_check,
  add constraint packaging_pricing_cost_rates_v5_gsm_override_check check (gsm_override is null or gsm_override > 0),
  drop constraint if exists packaging_pricing_cost_rates_v5_density_override_check,
  add constraint packaging_pricing_cost_rates_v5_density_override_check check (density_override is null or density_override > 0);

comment on column public.packaging_pricing_cost_rates_v5.micron_override is
  'Pricing-v5-only material thickness override. Null inherits the shared Cost Master value.';
comment on column public.packaging_pricing_cost_rates_v5.gsm_override is
  'Pricing-v5-only material GSM override. Null inherits the shared Cost Master value.';
comment on column public.packaging_pricing_cost_rates_v5.density_override is
  'Pricing-v5-only material density override. Null inherits the shared Cost Master value.';

commit;
