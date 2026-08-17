-- S51-PKG-043 live-schema reconciliation
-- Production v3 uses pricing_model; v4 needs an independent engine key without mutating v3.
begin;

alter table public.packaging_pricing_templates
  add column if not exists calculation_engine_key text;

alter table public.packaging_pricing_templates
  drop constraint if exists packaging_pricing_templates_v4_engine_key_check;

alter table public.packaging_pricing_templates
  add constraint packaging_pricing_templates_v4_engine_key_check
  check (
    calculation_engine_key is null
    or calculation_engine_key in ('sup_formula', 'matrix_per_frame', 'service_formula')
  );

comment on column public.packaging_pricing_templates.calculation_engine_key is
  'V4 pricing engine discriminator. NULL preserves legacy v3 pricing_model behavior.';

commit;
