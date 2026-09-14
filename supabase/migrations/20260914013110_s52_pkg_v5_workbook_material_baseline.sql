-- S52-PKG-V5-002B
-- Admin-confirmed Pricing v5 material baselines. These values are isolated from v4.
-- Workbook source: SUP quote model (2).xlsx. Commercial confirmation received 2026-09-14.
begin;

do $$
declare
  v_org constant uuid := 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
  v_template uuid;
begin
  select id into v_template
  from public.packaging_pricing_templates
  where organization_id=v_org and slug='stark-sup-formula-v5';

  if v_template is null then
    raise exception 'Stark SUP Formula v5 template is required before material baselines can be seeded.';
  end if;

  -- 12 micron PET and 12 micron Clear PET are the same commercial material.
  -- Admin confirmed INR 165/kg and 16.8 GSM for both.
  update public.packaging_pricing_cost_rates_v5 r
  set current_rate=165,
      micron_override=12,
      gsm_override=16.8,
      density_override=1.4,
      metadata=coalesce(r.metadata,'{}'::jsonb) || jsonb_build_object(
        'pricing_v5_source','SUP quote model (2).xlsx + admin confirmation',
        'source_basis','admin_confirmed_material_rate',
        'source_material','12 PET / Clear PET',
        'same_material_group','12_pet_clear_pet',
        'confirmed_on','2026-09-14',
        'status','admin_confirmed'
      ),
      updated_at=now()
  from public.packaging_cost_master_items m
  where r.organization_id=v_org
    and r.template_id=v_template
    and r.cost_master_item_id=m.id
    and m.organization_id=v_org
    and m.code in ('MAT_PET_12','MAT_CLEAR_PET_12');

  -- 9 micron aluminium foil: Admin confirmed INR 550/kg and 24.2 GSM.
  -- Store GSM directly so the engine uses the confirmed physical value.
  update public.packaging_pricing_cost_rates_v5 r
  set current_rate=550,
      micron_override=9,
      gsm_override=24.2,
      density_override=(24.2/9.0),
      metadata=coalesce(r.metadata,'{}'::jsonb) || jsonb_build_object(
        'pricing_v5_source','SUP quote model (2).xlsx + admin confirmation',
        'source_basis','admin_confirmed_material_rate',
        'source_material','9 micron Aluminium Foil',
        'confirmed_on','2026-09-14',
        'status','admin_confirmed'
      ),
      updated_at=now()
  from public.packaging_cost_master_items m
  where r.organization_id=v_org
    and r.template_id=v_template
    and r.cost_master_item_id=m.id
    and m.organization_id=v_org
    and m.code='MAT_AL_FOIL_9';

  -- 12 micron HoloPET: Admin confirmed INR 330/kg and 16.8 GSM.
  update public.packaging_pricing_cost_rates_v5 r
  set current_rate=330,
      micron_override=12,
      gsm_override=16.8,
      density_override=1.4,
      metadata=coalesce(r.metadata,'{}'::jsonb) || jsonb_build_object(
        'pricing_v5_source','admin confirmation',
        'source_basis','admin_confirmed_material_rate',
        'source_material','12 micron HoloPET',
        'confirmed_on','2026-09-14',
        'status','admin_confirmed'
      ),
      updated_at=now()
  from public.packaging_cost_master_items m
  where r.organization_id=v_org
    and r.template_id=v_template
    and r.cost_master_item_id=m.id
    and m.organization_id=v_org
    and m.code='MAT_HOLOPET_12';

  -- 12 micron Satin Matt PET: Admin confirmed INR 350/kg and 16.8 GSM.
  update public.packaging_pricing_cost_rates_v5 r
  set current_rate=350,
      micron_override=12,
      gsm_override=16.8,
      density_override=1.4,
      metadata=coalesce(r.metadata,'{}'::jsonb) || jsonb_build_object(
        'pricing_v5_source','admin confirmation',
        'source_basis','admin_confirmed_material_rate',
        'source_material','12 micron Satin Matt PET',
        'confirmed_on','2026-09-14',
        'status','admin_confirmed'
      ),
      updated_at=now()
  from public.packaging_cost_master_items m
  where r.organization_id=v_org
    and r.template_id=v_template
    and r.cost_master_item_id=m.id
    and m.organization_id=v_org
    and m.code='MAT_SATIN_MATT_PET_12';

  -- 15 micron Velvet Touch PET: Admin confirmed INR 550/kg and 18 GSM.
  -- Density override is derived from the confirmed GSM/thickness for consistency.
  update public.packaging_pricing_cost_rates_v5 r
  set current_rate=550,
      micron_override=15,
      gsm_override=18,
      density_override=(18.0/15.0),
      metadata=coalesce(r.metadata,'{}'::jsonb) || jsonb_build_object(
        'pricing_v5_source','admin confirmation',
        'source_basis','admin_confirmed_material_rate',
        'source_material','15 micron Velvet Touch PET',
        'confirmed_on','2026-09-14',
        'status','admin_confirmed'
      ),
      updated_at=now()
  from public.packaging_cost_master_items m
  where r.organization_id=v_org
    and r.template_id=v_template
    and r.cost_master_item_id=m.id
    and m.organization_id=v_org
    and m.code='MAT_VELVET_PET_15';
end $$;

commit;
