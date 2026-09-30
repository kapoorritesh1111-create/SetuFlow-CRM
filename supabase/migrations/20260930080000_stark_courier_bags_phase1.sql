begin;

insert into public.packaging_service_families (
  organization_id, slug, name, description, pricing_mode, quote_time_inputs,
  default_unit, default_lead_time, sort_order, is_active, icon_key,
  product_setup_mode, pricing_engine_type, default_uom, is_quoteable
)
values (
  'b97913cb-3b95-4247-8ced-ffdc0d392d2a',
  'courier-bags',
  'Courier Bags',
  'Custom-dimension courier bags. Capture dimensions and quantity manually. Commercial pricing is manual until Stark Packmate approves a quotation model. Sales may use chat, brochures and artwork management.',
  'service',
  '[]'::jsonb,
  'pcs',
  null,
  7,
  true,
  'package',
  'custom_dimensions',
  null,
  'pcs',
  false
)
on conflict (organization_id, slug) do update set
  name = excluded.name,
  description = excluded.description,
  pricing_mode = 'service',
  quote_time_inputs = '[]'::jsonb,
  default_unit = 'pcs',
  sort_order = 7,
  is_active = true,
  icon_key = 'package',
  product_setup_mode = 'custom_dimensions',
  pricing_engine_type = null,
  default_uom = 'pcs',
  is_quoteable = false,
  updated_at = now();

do $$
declare
  v_family uuid;
  v_brochure uuid;
begin
  select id into v_family
  from public.packaging_service_families
  where organization_id = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'
    and slug = 'courier-bags';

  select id into v_brochure
  from public.catalog_brochures
  where organization_id = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'
    and name = 'Courier Bags'
  order by created_at desc
  limit 1;

  if v_brochure is null then
    insert into public.catalog_brochures (
      organization_id, name, description, storage_bucket, storage_path,
      file_name, mime_type, file_size, is_active
    ) values (
      'b97913cb-3b95-4247-8ced-ffdc0d392d2a',
      'Courier Bags',
      'Courier bag styles for custom-dimension requirements. Share dimensions and quantity for manual pricing.',
      'public-static',
      '/brochures/courier-bags',
      'Stark Packmate Courier Bags',
      'text/html',
      null,
      true
    )
    returning id into v_brochure;
  else
    update public.catalog_brochures
    set description = 'Courier bag styles for custom-dimension requirements. Share dimensions and quantity for manual pricing.',
        storage_bucket = 'public-static',
        storage_path = '/brochures/courier-bags',
        file_name = 'Stark Packmate Courier Bags',
        mime_type = 'text/html',
        is_active = true,
        updated_at = now()
    where id = v_brochure;
  end if;

  insert into public.catalog_brochure_families (brochure_id, packaging_family_id)
  select v_brochure, v_family
  where not exists (
    select 1
    from public.catalog_brochure_families
    where brochure_id = v_brochure
      and packaging_family_id = v_family
  );
end $$;

commit;
