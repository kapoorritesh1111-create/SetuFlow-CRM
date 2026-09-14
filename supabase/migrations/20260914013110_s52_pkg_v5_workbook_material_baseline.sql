-- S52-PKG-V5-002B
-- Workbook-backed Pricing v5 material baselines. These values are isolated from v4.
-- Source: SUP quote model (2).xlsx costing worksheets.
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
    raise exception 'Stark SUP Formula v5 template is required before workbook material baselines can be seeded.';
  end if;

  -- 12 PET is costed at INR 165/kg in the foil worksheet. The workbook uses
  -- density 1.4, giving 16.8 GSM for 12 micron PET.
  update public.packaging_pricing_cost_rates_v5 r
  set current_rate=165,
      micron_override=12,
      gsm_override=16.8,
      density_override=1.4,
      metadata=coalesce(r.metadata,'{}'::jsonb) || jsonb_build_object(
        'pricing_v5_source','SUP quote model (2).xlsx',
        'source_basis','workbook_costing_sheet',
        'source_material','12 PET',
        'status','workbook_baseline_pending_admin_confirmation'
      ),
      updated_at=now()
  from public.packaging_cost_master_items m
  where r.organization_id=v_org
    and r.template_id=v_template
    and r.cost_master_item_id=m.id
    and m.organization_id=v_org
    and m.code='MAT_PET_12';

  -- The workbook Construction sheet treats clear-window 12 PET as standard PET.
  -- Use the same workbook baseline in v5 while keeping it a distinct master row.
  update public.packaging_pricing_cost_rates_v5 r
  set current_rate=165,
      micron_override=12,
      gsm_override=16.8,
      density_override=1.4,
      metadata=coalesce(r.metadata,'{}'::jsonb) || jsonb_build_object(
        'pricing_v5_source','SUP quote model (2).xlsx',
        'source_basis','workbook_inferred_from_standard_12_pet',
        'source_material','12 Clear PET',
        'status','workbook_baseline_pending_admin_confirmation'
      ),
      updated_at=now()
  from public.packaging_cost_master_items m
  where r.organization_id=v_org
    and r.template_id=v_template
    and r.cost_master_item_id=m.id
    and m.organization_id=v_org
    and m.code='MAT_CLEAR_PET_12';

  -- 9 micron aluminium foil is explicitly costed at INR 550/kg and 24.2 GSM.
  -- Store the workbook GSM directly so v5 reproduces the sheet instead of
  -- inheriting the shared 2.7 density approximation (24.3 GSM).
  update public.packaging_pricing_cost_rates_v5 r
  set current_rate=550,
      micron_override=9,
      gsm_override=24.2,
      density_override=(24.2/9.0),
      metadata=coalesce(r.metadata,'{}'::jsonb) || jsonb_build_object(
        'pricing_v5_source','SUP quote model (2).xlsx',
        'source_basis','workbook_costing_sheet',
        'source_material','9 micron Aluminium Foil',
        'status','workbook_baseline_pending_admin_confirmation'
      ),
      updated_at=now()
  from public.packaging_cost_master_items m
  where r.organization_id=v_org
    and r.template_id=v_template
    and r.cost_master_item_id=m.id
    and m.organization_id=v_org
    and m.code='MAT_AL_FOIL_9';
end $$;

commit;
