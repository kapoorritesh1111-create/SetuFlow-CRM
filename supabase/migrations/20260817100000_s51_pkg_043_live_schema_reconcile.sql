-- S51-PKG-043 live-schema reconciliation
-- Production v3 uses pricing_model; v4 needs an independent engine key without mutating v3.
begin;

alter table public.packaging_pricing_templates
  add column if not exists calculation_engine_key text,
  add column if not exists production_rules_json jsonb not null default '{}'::jsonb;

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
comment on column public.packaging_pricing_templates.production_rules_json is
  'V4 production geometry/configuration only. Master rates must never be copied here.';

-- Stark has confirmed the Zipper basis/stage, but the remaining Extras/Pre/Post
-- rows still need their charging basis confirmed. Preserve that source truth as
-- NULL instead of inventing a basis merely to satisfy a database column.
alter table public.packaging_charge_master_items
  alter column basis drop not null,
  alter column application_stage drop not null;

comment on column public.packaging_charge_master_items.basis is
  'NULL means charging basis still requires client confirmation; a published recipe may not select it.';
comment on column public.packaging_charge_master_items.application_stage is
  'NULL means application stage still requires client confirmation; a published recipe may not select it.';

commit;
