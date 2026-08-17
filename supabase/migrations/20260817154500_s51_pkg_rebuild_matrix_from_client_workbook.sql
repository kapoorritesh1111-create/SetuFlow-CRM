-- S51-PKG-046/047/048
-- Rebuild Center Seal / 3SS pricing around the client-approved workbook model.
-- Stand Up Pouch v4 is intentionally untouched.
-- Latest client workbook SHA-256: 00340af1d298426b5679349d9bf2777423c5d0ec4b1dd814941fa2db72be29ff
-- Preflight verification proved the existing 96/48/48 Product ID + Q1-Q5 rate payloads
-- and preserved source formulas are byte-for-byte equivalent to the newly supplied workbook.
-- The defect being corrected is template ownership/geometry/UX, not the feeding-sheet rates.

begin;

create temporary table stark_matrix_rebuild_source on commit drop as
select
  t.slug as template_slug,
  r.supply_form,
  r.construction_key,
  r.client_product_id,
  r.q1_rate_per_frame,
  r.q2_rate_per_frame,
  r.q3_rate_per_frame,
  r.q4_rate_per_frame,
  r.q5_rate_per_frame,
  r.source_worksheet,
  r.source_row_number,
  r.metadata
from public.packaging_pricing_matrix_rows r
join public.packaging_pricing_templates t on t.id = r.template_id
where r.organization_id = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
  and t.slug in ('stark-center-seal-matrix-v4','stark-3ss-roll-matrix-v4','stark-3ss-pouch-matrix-v4')
  and r.is_active;

-- The user explicitly approved removing every non-SUP v4 pricing draft before rebuilding.
-- This also removes the ad-hoc "CS pouch" UAT draft. Related matrix/recipe rows cascade.
delete from public.packaging_pricing_templates
where organization_id = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
  and calculation_version = 4
  and slug <> 'stark-sup-formula-v4';

insert into public.packaging_pricing_templates (
  organization_id, family_id, slug, name, description, currency, is_active,
  calculation_version, status, calculation_engine_key, pricing_model,
  production_rules_json, quote_config_json
)
select
  'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid, f.id,
  'stark-center-seal-matrix-v4', 'Stark Center Seal Workbook v4',
  'Client workbook-backed calculator. Enter pouch width-open and pouch height; construction rates come from CS DATA.',
  'INR', false, 4, 'draft', 'matrix_per_frame', 'workbook_matrix_v4',
  '{"geometry":"fixed_orientation_workbook_v2","machine_width_mm":740,"machine_length_mm":1120}'::jsonb,
  '{"gst_pct":18,"tiers":{"Q1":250,"Q2":500,"Q3":1000,"Q4":2000,"Q5":3000},"workbook_model":"dimension_construction_price_breaks","source_form_sheet":"CENTER SEAL POUCH","dimension_labels":{"width":"Pouch width - open","height":"Pouch height"},"default_dimensions":{"width_mm":100,"height_mm":140}}'::jsonb
from public.packaging_service_families f
where f.organization_id='b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid and f.slug='center-seal-pouches'
limit 1;

insert into public.packaging_pricing_templates (
  organization_id, family_id, slug, name, description, currency, is_active,
  calculation_version, status, calculation_engine_key, pricing_model,
  production_rules_json, quote_config_json
)
select
  'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid, f.id,
  'stark-3ss-roll-matrix-v4', 'Stark 3SS Roll Form Workbook v4',
  'Client workbook-backed calculator. Enter open book-fold pouch width and pouch height; construction rates come from 3SS ROLL FORM DATA.',
  'INR', false, 4, 'draft', 'matrix_per_frame', 'workbook_matrix_v4',
  '{"geometry":"fixed_orientation_workbook_v2","machine_width_mm":740,"machine_length_mm":1120}'::jsonb,
  '{"gst_pct":18,"tiers":{"Q1":250,"Q2":500,"Q3":1000,"Q4":2000,"Q5":3000},"workbook_model":"dimension_construction_price_breaks","source_form_sheet":"3SS ROLL FORM","dimension_labels":{"width":"Pouch width - open - Book fold style","height":"Pouch height"},"default_dimensions":{"width_mm":148,"height_mm":50}}'::jsonb
from public.packaging_service_families f
where f.organization_id='b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid and f.slug='three-side-seal-pouches'
limit 1;

insert into public.packaging_pricing_templates (
  organization_id, family_id, slug, name, description, currency, is_active,
  calculation_version, status, calculation_engine_key, pricing_model,
  production_rules_json, quote_config_json
)
select
  'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid, f.id,
  'stark-3ss-pouch-matrix-v4', 'Stark 3SS Pouch Form Workbook v4',
  'Client workbook-backed calculator. Enter formed pouch width/height; SETU derives laminate open width = 2 x height + 12 and repeat = formed width.',
  'INR', false, 4, 'draft', 'matrix_per_frame', 'workbook_matrix_v4',
  '{"geometry":"three_side_seal_pouch_workbook_v2","machine_width_mm":740,"machine_length_mm":1120,"open_laminate_width_rule":"2*formed_height_mm+12","repeat_length_rule":"formed_width_mm"}'::jsonb,
  '{"gst_pct":18,"tiers":{"Q1":250,"Q2":500,"Q3":1000,"Q4":2000,"Q5":3000},"workbook_model":"dimension_construction_price_breaks","source_form_sheet":"3SS POUCH FORM","dimension_labels":{"width":"Formed pouch width","height":"Formed pouch height"},"default_dimensions":{"width_mm":60,"height_mm":60}}'::jsonb
from public.packaging_service_families f
where f.organization_id='b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid and f.slug='three-side-seal-pouches'
limit 1;

insert into public.packaging_pricing_matrix_rows (
  organization_id, template_id, supply_form, construction_key, client_product_id,
  q1_rate_per_frame, q2_rate_per_frame, q3_rate_per_frame, q4_rate_per_frame, q5_rate_per_frame,
  source_worksheet, source_row_number, source_reference, is_active, metadata
)
select
  'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid,
  t.id, s.supply_form, s.construction_key, s.client_product_id,
  s.q1_rate_per_frame, s.q2_rate_per_frame, s.q3_rate_per_frame, s.q4_rate_per_frame, s.q5_rate_per_frame,
  s.source_worksheet, s.source_row_number,
  'Copy of CENTER SEAL AND 3 SIDE SEAL POUCH COSTING.xlsx :: ' || s.source_worksheet || '!A' || s.source_row_number || ':G' || s.source_row_number,
  true,
  jsonb_set(
    jsonb_set(
      jsonb_set(coalesce(s.metadata,'{}'::jsonb), '{source_workbook}', '"Copy of CENTER SEAL AND 3 SIDE SEAL POUCH COSTING.xlsx"'::jsonb, true),
      '{source_workbook_sha256}', '"00340af1d298426b5679349d9bf2777423c5d0ec4b1dd814941fa2db72be29ff"'::jsonb, true
    ),
    '{workbook_model}', '"feeding_sheet_rate_row"'::jsonb, true
  )
from stark_matrix_rebuild_source s
join public.packaging_pricing_templates t
  on t.organization_id='b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
 and t.slug=s.template_slug
 and t.calculation_version=4;

do $$
declare
  v_center integer;
  v_roll integer;
  v_pouch integer;
  v_other integer;
begin
  select count(*) into v_center from public.packaging_pricing_matrix_rows r join public.packaging_pricing_templates t on t.id=r.template_id where r.organization_id='b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid and t.slug='stark-center-seal-matrix-v4';
  select count(*) into v_roll from public.packaging_pricing_matrix_rows r join public.packaging_pricing_templates t on t.id=r.template_id where r.organization_id='b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid and t.slug='stark-3ss-roll-matrix-v4';
  select count(*) into v_pouch from public.packaging_pricing_matrix_rows r join public.packaging_pricing_templates t on t.id=r.template_id where r.organization_id='b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid and t.slug='stark-3ss-pouch-matrix-v4';
  select count(*) into v_other from public.packaging_pricing_templates where organization_id='b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid and calculation_version=4 and slug not in ('stark-sup-formula-v4','stark-center-seal-matrix-v4','stark-3ss-roll-matrix-v4','stark-3ss-pouch-matrix-v4');
  if v_center<>96 or v_roll<>48 or v_pouch<>48 then raise exception 'Workbook rebuild row counts invalid: CS %, 3SS roll %, 3SS pouch %',v_center,v_roll,v_pouch; end if;
  if v_other<>0 then raise exception 'Unexpected non-canonical v4 pricing templates remain: %',v_other; end if;
end $$;

commit;
