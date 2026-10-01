begin;

insert into public.packaging_service_families (
  organization_id, slug, name, description, pricing_mode, quote_time_inputs,
  default_unit, default_lead_time, sort_order, is_active, icon_key,
  product_setup_mode, pricing_engine_type, default_uom, is_quoteable
)
values (
  'b97913cb-3b95-4247-8ced-ffdc0d392d2a',
  'spout-pouches',
  'Spout Pouches',
  'Custom-dimension spout pouches. Sales captures dimensions, quantity and a customer-specific manual unit price until a dedicated automated pricing model is approved.',
  'dimensional',
  '[{"key":"dimensions","label":"Custom dimensions"},{"key":"quantity","label":"Quantity"},{"key":"manual_unit_price","label":"Custom unit price"}]'::jsonb,
  'pcs',
  null,
  8,
  true,
  'package',
  'custom_dimensions',
  null,
  'pcs',
  true
)
on conflict (organization_id, slug) do update set
  name = excluded.name,
  description = excluded.description,
  pricing_mode = excluded.pricing_mode,
  quote_time_inputs = excluded.quote_time_inputs,
  default_unit = excluded.default_unit,
  sort_order = excluded.sort_order,
  is_active = true,
  icon_key = excluded.icon_key,
  product_setup_mode = 'custom_dimensions',
  pricing_engine_type = null,
  default_uom = 'pcs',
  is_quoteable = true,
  updated_at = now();

commit;
