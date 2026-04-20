begin;

alter table public.product_variants
  add column if not exists country_of_origin text,
  add column if not exists export_metadata jsonb not null default '{}'::jsonb,
  add column if not exists packaging_type text,
  add column if not exists packaging_unit text,
  add column if not exists shipment_notes text,
  add column if not exists shipment_attributes jsonb not null default '{}'::jsonb;

update public.product_variants
set
  country_of_origin = coalesce(country_of_origin, source_payload #>> '{setu_trade_attributes,countryOfOrigin}'),
  export_metadata = case
    when coalesce(export_metadata, '{}'::jsonb) = '{}'::jsonb
         and coalesce(source_payload #>> '{setu_trade_attributes,exportMetadata}', '') <> ''
      then jsonb_build_object('summary', source_payload #>> '{setu_trade_attributes,exportMetadata}')
    else coalesce(export_metadata, '{}'::jsonb)
  end,
  packaging_type = coalesce(packaging_type, source_payload #>> '{setu_trade_attributes,packagingType}'),
  packaging_unit = coalesce(packaging_unit, source_payload #>> '{setu_trade_attributes,packagingUnit}'),
  units_per_case = coalesce(units_per_case, nullif(source_payload #>> '{setu_trade_attributes,unitsPerCase}', '')::numeric),
  net_weight_kg = coalesce(net_weight_kg, nullif(source_payload #>> '{setu_trade_attributes,netWeightKg}', '')::numeric),
  shipment_notes = coalesce(shipment_notes, source_payload #>> '{setu_trade_attributes,shipmentNotes}'),
  pricing_mode_default = coalesce(pricing_mode_default, nullif(source_payload #>> '{setu_trade_attributes,unitOfMeasure}', '')),
  shipment_attributes = case
    when coalesce(shipment_attributes, '{}'::jsonb) = '{}'::jsonb
         and coalesce(source_payload #>> '{setu_trade_attributes,shipmentNotes}', '') <> ''
      then jsonb_build_object('notes', source_payload #>> '{setu_trade_attributes,shipmentNotes}')
    else coalesce(shipment_attributes, '{}'::jsonb)
  end
where source_payload is not null;

alter table public.lead_product_interests
  add column if not exists interest_type text not null default 'confirmed_product',
  add column if not exists source_context jsonb not null default '{}'::jsonb;

update public.lead_product_interests
set
  interest_type = case
    when label is not null
         and left(ltrim(label), 1) = '{'
         and coalesce(nullif((label::jsonb ->> 'interestType'), ''), '') <> ''
      then (label::jsonb ->> 'interestType')
    when product_id is null
      then 'category_only'
    else coalesce(interest_type, 'confirmed_product')
  end,
  source_context = case
    when coalesce(source_context, '{}'::jsonb) = '{}'::jsonb
         and label is not null
         and left(ltrim(label), 1) = '{'
      then coalesce(label::jsonb, '{}'::jsonb)
    when coalesce(source_context, '{}'::jsonb) = '{}'::jsonb
         and label is not null
         and btrim(label) <> ''
      then jsonb_build_object('legacy_label', label)
    else coalesce(source_context, '{}'::jsonb)
  end
where label is not null or product_id is null;

commit;