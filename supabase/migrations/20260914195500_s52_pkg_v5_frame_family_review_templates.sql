-- S52-PKG-V5-FRAME-001
-- Add review-only Pricing v5 templates for Center Seal and 3 Side Seal.
-- These templates are intentionally draft + inactive. They do not change Sales pricing.
begin;

alter table public.packaging_pricing_templates
  drop constraint if exists packaging_pricing_templates_v4_engine_key_check;
alter table public.packaging_pricing_templates
  add constraint packaging_pricing_templates_v4_engine_key_check
  check (calculation_engine_key is null or calculation_engine_key in (
    'sup_formula','sup_formula_v5','frame_formula_v5','matrix_per_frame','service_formula'
  ));

with org as (
  select 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid as id
), family as (
  select id,slug from public.packaging_service_families
  where organization_id=(select id from org)
    and slug in ('center-seal-pouches','three-side-seal-pouches')
)
insert into public.packaging_pricing_templates (
  organization_id,family_id,slug,name,description,currency,is_active,
  calculation_version,calculation_engine_key,pricing_model,status,
  production_rules_json,quote_config_json
)
select
  (select id from org),
  f.id,
  x.slug,
  x.name,
  x.description,
  'INR',
  false,
  5,
  'frame_formula_v5',
  'sup_standard_matrix',
  'draft',
  jsonb_build_object(
    'machine_width_mm',740,
    'machine_length_mm',1120,
    'geometry_source','stark_v4_workbook_rule',
    'commercial_bucket_mapping','owner_confirmation_required',
    'migration_review_only',true,
    'supply_form',x.supply_form
  ),
  jsonb_build_object(
    'gst_pct',18,
    'review_only',true,
    'v4_baseline_slug',x.v4_baseline_slug,
    'activation_blocked_until_owner_approval',true
  )
from family f
join (values
  ('center-seal-pouches','stark-center-seal-roll-v5-review','Stark Center Seal Roll Form v5 Review','Review-only RMC/process/run-length pricing migration from the Center Seal v4 workbook.','center_seal_roll','stark-center-seal-matrix-v4'),
  ('center-seal-pouches','stark-center-seal-pouch-v5-review','Stark Center Seal Pouch Form v5 Review','Review-only RMC/process/run-length pricing migration from the Center Seal v4 workbook.','center_seal_pouch','stark-center-seal-matrix-v4'),
  ('three-side-seal-pouches','stark-3ss-roll-v5-review','Stark 3SS Roll Form v5 Review','Review-only RMC/process/run-length pricing migration from the 3SS Roll v4 workbook.','three_side_seal_roll','stark-3ss-roll-matrix-v4'),
  ('three-side-seal-pouches','stark-3ss-pouch-v5-review','Stark 3SS Pouch Form v5 Review','Review-only RMC/process/run-length pricing migration from the 3SS Pouch v4 workbook.','three_side_seal_pouch','stark-3ss-pouch-matrix-v4')
) as x(family_slug,slug,name,description,supply_form,v4_baseline_slug)
  on x.family_slug=f.slug
on conflict (organization_id,slug) do update set
  family_id=excluded.family_id,
  name=excluded.name,
  description=excluded.description,
  calculation_version=5,
  calculation_engine_key='frame_formula_v5',
  is_active=false,
  status='draft',
  production_rules_json=excluded.production_rules_json,
  quote_config_json=excluded.quote_config_json,
  updated_at=now();

-- Copy the approved v5 review Cost Master rates from SUP into each review template.
-- The identities remain shared, but rates stay revision-scoped and can diverge later.
with org as (
  select 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid as id
), source_template as (
  select id from public.packaging_pricing_templates
  where organization_id=(select id from org) and slug='stark-sup-formula-v5'
), target_templates as (
  select id from public.packaging_pricing_templates
  where organization_id=(select id from org)
    and slug in (
      'stark-center-seal-roll-v5-review','stark-center-seal-pouch-v5-review',
      'stark-3ss-roll-v5-review','stark-3ss-pouch-v5-review'
    )
)
insert into public.packaging_pricing_cost_rates_v5 (
  organization_id,template_id,cost_master_item_id,current_rate,metadata
)
select
  r.organization_id,
  t.id,
  r.cost_master_item_id,
  r.current_rate,
  coalesce(r.metadata,'{}'::jsonb) || jsonb_build_object('source_template','stark-sup-formula-v5','migration_review',true)
from public.packaging_pricing_cost_rates_v5 r
cross join target_templates t
where r.organization_id=(select id from org)
  and r.template_id=(select id from source_template)
on conflict (organization_id,template_id,cost_master_item_id) do update set
  current_rate=excluded.current_rate,
  metadata=excluded.metadata,
  updated_at=now();

-- Copy the SUP run-length schedules for review. The engine still fails closed until
-- the owner confirms how each frame family maps into the commercial buckets.
with org as (
  select 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid as id
), source_template as (
  select id from public.packaging_pricing_templates
  where organization_id=(select id from org) and slug='stark-sup-formula-v5'
), target_templates as (
  select id from public.packaging_pricing_templates
  where organization_id=(select id from org)
    and slug in (
      'stark-center-seal-roll-v5-review','stark-center-seal-pouch-v5-review',
      'stark-3ss-roll-v5-review','stark-3ss-pouch-v5-review'
    )
)
insert into public.packaging_pricing_commercial_bands_v5 (
  organization_id,template_id,pricing_bucket,run_length_max_m,wastage_pct,margin_per_frame,sort_order,metadata
)
select
  b.organization_id,
  t.id,
  b.pricing_bucket,
  b.run_length_max_m,
  b.wastage_pct,
  b.margin_per_frame,
  b.sort_order,
  coalesce(b.metadata,'{}'::jsonb) || jsonb_build_object('source_template','stark-sup-formula-v5','migration_review',true)
from public.packaging_pricing_commercial_bands_v5 b
cross join target_templates t
where b.organization_id=(select id from org)
  and b.template_id=(select id from source_template)
on conflict (organization_id,template_id,pricing_bucket,run_length_max_m) do update set
  wastage_pct=excluded.wastage_pct,
  margin_per_frame=excluded.margin_per_frame,
  sort_order=excluded.sort_order,
  metadata=excluded.metadata,
  updated_at=now();

commit;
