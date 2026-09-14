-- S52-PKG-V5-008
-- Controlled Pricing v5 publish + Stark-only Sales activation.
-- Fails closed unless the workbook catalog and required v5 costing inputs are ready.
begin;

do $$
declare
  v_org constant uuid := 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
  v_template uuid;
  v_family uuid;
  v_size_count integer;
  v_construction_count integer;
  v_missing_required integer;
  v_missing_layer_inputs integer;
begin
  select id,family_id into v_template,v_family
  from public.packaging_pricing_templates
  where organization_id=v_org
    and slug='stark-sup-formula-v5'
    and calculation_version=5
    and calculation_engine_key='sup_formula_v5'
  order by created_at desc
  limit 1;

  if v_template is null then
    raise exception 'Stark Pricing v5 template is missing.';
  end if;

  select count(*) into v_size_count
  from public.packaging_size_profiles_v5
  where organization_id=v_org and template_id=v_template and is_active=true;

  if v_size_count<>20 then
    raise exception 'Pricing v5 release requires exactly 20 active workbook sizes; found %.',v_size_count;
  end if;

  select count(*) into v_construction_count
  from public.packaging_constructions_v5
  where organization_id=v_org and template_id=v_template and is_active=true;

  if v_construction_count<44 then
    raise exception 'Pricing v5 release requires at least 44 active workbook constructions; found %.',v_construction_count;
  end if;

  select count(*) into v_missing_required
  from (values
    ('MAT_ADHESIVE'),('PROC_PRINT_CMYK'),('PROC_PRINT_CMYKW'),('PROC_LAMINATION'),('PROC_SLITTING'),('PROC_POUCHING')
  ) required(code)
  left join public.packaging_cost_master_items m
    on m.organization_id=v_org and m.code=required.code and m.is_active=true
  left join public.packaging_pricing_cost_rates_v5 r
    on r.organization_id=v_org and r.template_id=v_template and r.cost_master_item_id=m.id
  where m.id is null or r.current_rate is null;

  if v_missing_required>0 then
    raise exception 'Pricing v5 release is missing % required core process/material rates.',v_missing_required;
  end if;

  select count(*) into v_missing_layer_inputs
  from public.packaging_constructions_v5 c
  join public.packaging_construction_layers_v5 l
    on l.organization_id=c.organization_id and l.template_id=c.template_id and l.construction_id=c.id
  join public.packaging_cost_master_items m
    on m.organization_id=l.organization_id and m.id=l.cost_master_item_id
  left join public.packaging_pricing_cost_rates_v5 r
    on r.organization_id=l.organization_id and r.template_id=l.template_id and r.cost_master_item_id=m.id
  where c.organization_id=v_org
    and c.template_id=v_template
    and c.is_active=true
    and (
      r.current_rate is null
      or (
        m.item_type='material' and m.rate_basis='per_kg'
        and coalesce(r.gsm_override,m.gsm) is null
        and (coalesce(r.micron_override,m.micron) is null or coalesce(r.density_override,m.density) is null)
      )
    );

  if v_missing_layer_inputs>0 then
    raise exception 'Pricing v5 release has % construction layers with incomplete rate/physical inputs.',v_missing_layer_inputs;
  end if;

  -- All approved workbook sizes and constructions become available to Sales.
  update public.packaging_size_profiles_v5
  set is_quoteable=true,updated_at=now()
  where organization_id=v_org and template_id=v_template and is_active=true;

  update public.packaging_constructions_v5
  set is_quoteable=true,updated_at=now()
  where organization_id=v_org and template_id=v_template and is_active=true;

  -- Only one active published v5 revision per family.
  update public.packaging_pricing_templates
  set status='archived',is_active=false,updated_at=now()
  where organization_id=v_org
    and family_id=v_family
    and calculation_version=5
    and calculation_engine_key='sup_formula_v5'
    and id<>v_template
    and status='published';

  update public.packaging_pricing_templates
  set status='published',is_active=true,published_at=coalesce(published_at,now()),updated_at=now(),
      quote_config_json=coalesce(quote_config_json,'{}'::jsonb)||jsonb_build_object(
        'sales_activation_scope','starkpackmate',
        'sales_activation_mode','post_publish_uat',
        'activated_on','2026-09-14'
      )
  where organization_id=v_org and id=v_template;

  -- Stark-only feature activation. v4 flag remains untouched for rollback.
  update public.smc_feature_flags
  set enabled=true,
      rollout_percentage=100,
      allowed_orgs=array[v_org],
      blocked_orgs=array[]::uuid[],
      description='Pricing v5 published for Stark Packmate Sales UAT. Workbook-backed SUP engine with v4 fallback retained.',
      updated_at=now()
  where flag_key='packaging_pricing_v5';

  if not found then
    raise exception 'Pricing v5 feature flag is missing.';
  end if;
end $$;

commit;
