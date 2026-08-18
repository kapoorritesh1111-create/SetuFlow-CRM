-- S51-PKG-044 / S51-PKG-047
-- Stark Packmate pricing v4 source-backed seed.
-- All values below come from the final 17 Aug 2026 implementation handoff.
-- Missing client rates/bases remain NULL. Full Center/3SS matrix rows are NOT
-- fabricated here; only the three handoff acceptance anchors are seeded.
begin;

do $$
declare
  v_org constant uuid := 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
  v_sup uuid;
  v_flat uuid;
  v_center uuid;
  v_3ss uuid;
  v_labels uuid;
  v_sleeves uuid;
  v_sup_template uuid;
  v_center_template uuid;
  v_3ss_roll_template uuid;
  v_3ss_pouch_template uuid;
begin
  -- Approved family catalog. Legacy pricing_mode values are retained only for
  -- backward-compatible schema; v4 routes by pricing_engine_type/template engine.
  insert into public.packaging_service_families
    (organization_id, slug, name, description, pricing_mode, quote_time_inputs, default_unit,
     sort_order, is_active, product_setup_mode, pricing_engine_type, default_uom, is_quoteable)
  values
    (v_org,'standup-pouches','Stand Up Pouches','Approved-size stand up pouch pricing.','dimensional','[]'::jsonb,'pcs',1,true,'approved_sizes','sup_formula','pcs',false),
    (v_org,'flat-bottom-pouches','Flat Bottom Pouches','Approved/custom flat bottom pouches. Formula source still required.','dimensional','[]'::jsonb,'pcs',2,true,'both','service_formula','pcs',false),
    (v_org,'center-seal-pouches','Center Seal Pouches','Dynamic dimensions with approved matrix-per-frame pricing.','dimensional','[]'::jsonb,'pcs',3,true,'custom_dimensions','matrix_per_frame','pcs',false),
    (v_org,'three-side-seal-pouches','3 Side Seal Pouches','Dynamic dimensions; Roll and Pouch forms use separate matrix templates.','dimensional','[]'::jsonb,'pcs',4,true,'custom_dimensions','matrix_per_frame','pcs',false),
    (v_org,'labels','Labels','Dynamic/SKU label family; future engine.','dimensional','[]'::jsonb,'pcs',5,true,'both','service_formula','pcs',false),
    (v_org,'shrink-sleeves','Shrink Sleeves','Dynamic shrink sleeve family; future engine.','dimensional','[]'::jsonb,'pcs',6,true,'custom_dimensions','service_formula','pcs',false)
  on conflict (organization_id, slug) do update set
    name=excluded.name,
    description=excluded.description,
    product_setup_mode=excluded.product_setup_mode,
    pricing_engine_type=excluded.pricing_engine_type,
    default_uom=excluded.default_uom,
    sort_order=excluded.sort_order,
    updated_at=now();

  select id into v_sup from public.packaging_service_families where organization_id=v_org and slug='standup-pouches';
  select id into v_flat from public.packaging_service_families where organization_id=v_org and slug='flat-bottom-pouches';
  select id into v_center from public.packaging_service_families where organization_id=v_org and slug='center-seal-pouches';
  select id into v_3ss from public.packaging_service_families where organization_id=v_org and slug='three-side-seal-pouches';
  select id into v_labels from public.packaging_service_families where organization_id=v_org and slug='labels';
  select id into v_sleeves from public.packaging_service_families where organization_id=v_org and slug='shrink-sleeves';

  -- Physical SUP variations only. PE selection is intentionally absent here.
  insert into public.packaging_product_variations
    (organization_id,family_id,variation_key,name,capacity_label,width_mm,height_mm,bottom_gusset_each_mm,dimension_label,approval_state,is_quoteable,is_active,sort_order)
  values
    (v_org,v_sup,'28g','28gm','28gm',80,130,25,'80 × 130 mm · BG 25+25','approved',false,true,1),
    (v_org,v_sup,'50g','50gm','50gm',98,150,30,'98 × 150 mm · BG 30+30','approved',false,true,2),
    (v_org,v_sup,'70g','70gm','70gm',110,170,30,'110 × 170 mm · BG 30+30','approved',false,true,3),
    (v_org,v_sup,'100g','100gm','100gm',120,210,40,'120 × 210 mm · BG 40+40','approved',false,true,4),
    (v_org,v_sup,'150g','150gm','150gm',130,210,40,'130 × 210 mm · BG 40+40','approved',false,true,5),
    (v_org,v_sup,'200g','200gm','200gm',140,210,40,'140 × 210 mm · BG 40+40','approved',false,true,6),
    (v_org,v_sup,'200_250g','200gm/250gm','200gm/250gm',150,220,50,'150 × 220 mm · BG 50+50','approved',false,true,7),
    (v_org,v_sup,'250g','250gm','250gm',160,230,50,'160 × 230 mm · BG 50+50','approved',false,true,8),
    (v_org,v_sup,'350g','350gm','350gm',170,250,50,'170 × 250 mm · BG 50+50','approved',false,true,9),
    (v_org,v_sup,'500g','500gm','500gm',185,270,50,'185 × 270 mm · BG 50+50','approved',false,true,10),
    (v_org,v_sup,'750_800g','750gm/800gm','750gm/800gm',210,300,55,'210 × 300 mm · BG 55+55','approved',false,true,11),
    (v_org,v_sup,'750g_1kg','750gm/1kg','750gm/1kg',220,300,55,'220 × 300 mm · BG 55+55','approved',false,true,12),
    (v_org,v_sup,'1kg','1kg','1kg',245,320,55,'245 × 320 mm · BG 55+55','approved',false,true,13),
    (v_org,v_sup,'1_5kg','1.5kg','1.5kg',260,340,60,'260 × 340 mm · BG 60+60','approved',false,true,14),
    (v_org,v_sup,'2kg','2kg','2kg',280,360,60,'280 × 360 mm · BG 60+60','approved',false,true,15)
  on conflict (organization_id,family_id,variation_key) do update set
    name=excluded.name,capacity_label=excluded.capacity_label,width_mm=excluded.width_mm,
    height_mm=excluded.height_mm,bottom_gusset_each_mm=excluded.bottom_gusset_each_mm,
    dimension_label=excluded.dimension_label,approval_state=excluded.approval_state,
    is_active=excluded.is_active,sort_order=excluded.sort_order,updated_at=now();

  -- Shared COGS master. NULL means Rate required, never zero.
  insert into public.packaging_cost_master_items
    (organization_id,code,name,item_type,specification,rate_basis,current_rate,rate_uom,currency,micron,gsm,density,metadata)
  values
    (v_org,'MAT_BOPP_MATT_18','18 Matt BOPP','material','18µ · density 0.93','per_kg',190,'kg','INR',18,null,0.93,'{}'),
    (v_org,'MAT_PET_12','12 PET','material','12µ · density 1.4','per_kg',null,'kg','INR',12,null,1.4,'{"rate_status":"required"}'),
    (v_org,'MAT_METPET_12','12 MetPET','material','12µ · density 1.4','per_kg',165,'kg','INR',12,null,1.4,'{}'),
    (v_org,'MAT_CLEAR_PET_12','12 Clear PET','material','12µ · density 1.4','per_kg',null,'kg','INR',12,null,1.4,'{"rate_status":"required"}'),
    (v_org,'MAT_AL_FOIL_9','9 Al Foil','material','9µ','per_kg',null,'kg','INR',9,null,null,'{"rate_status":"required","density_status":"required"}'),
    (v_org,'MAT_HOLOPET_12','12 HoloPET','material','12µ','per_kg',null,'kg','INR',12,null,null,'{"rate_status":"required","density_status":"required"}'),
    (v_org,'MAT_PE_35','PE 35µ','material','35µ · density 0.925','per_kg',185,'kg','INR',35,null,0.925,'{}'),
    (v_org,'MAT_PE_40','PE 40µ','material','40µ · density 0.925','per_kg',185,'kg','INR',40,null,0.925,'{}'),
    (v_org,'MAT_PE_60','PE 60µ','material','60µ · density 0.925','per_kg',185,'kg','INR',60,null,0.925,'{}'),
    (v_org,'MAT_PE_70','PE 70µ','material','70µ · density 0.925','per_kg',185,'kg','INR',70,null,0.925,'{}'),
    (v_org,'MAT_PE_75','PE 75µ','material','75µ · density 0.925','per_kg',185,'kg','INR',75,null,0.925,'{}'),
    (v_org,'MAT_PE_95','PE 95µ','material','95µ · density 0.925','per_kg',185,'kg','INR',95,null,0.925,'{}'),
    (v_org,'MAT_PE_120','PE 120µ','material','120µ · density 0.925','per_kg',185,'kg','INR',120,null,0.925,'{}'),
    (v_org,'MAT_ADHESIVE','Adhesive','material','1.5 GSM per bond','per_kg',350,'kg','INR',null,1.5,null,'{"gsm_per_bond":1.5}'),
    (v_org,'PROC_PRINT_CMYKW','CMYKW Print','process','Print process','per_frame',46,'frame','INR',null,null,null,'{}'),
    (v_org,'PROC_PRINT_CMYK','CMYK Print','process','Print process','per_frame',38,'frame','INR',null,null,null,'{}'),
    (v_org,'PROC_LAMINATION','Lamination','process','Lamination process','per_running_metre',5,'running_m','INR',null,null,null,'{}'),
    (v_org,'PROC_SLITTING','Slitting','process','Slitting process','per_running_metre',2,'running_m','INR',null,null,null,'{}'),
    (v_org,'PROC_POUCHING','Pouching','process','Pouching process','per_running_metre',8,'running_m','INR',null,null,null,'{}')
  on conflict (organization_id,code) do update set
    name=excluded.name,item_type=excluded.item_type,specification=excluded.specification,
    rate_basis=excluded.rate_basis,current_rate=excluded.current_rate,rate_uom=excluded.rate_uom,
    currency=excluded.currency,micron=excluded.micron,gsm=excluded.gsm,density=excluded.density,
    metadata=excluded.metadata,updated_at=now();

  -- Family availability links, using codes rather than hard-coded generated IDs.
  insert into public.packaging_cost_master_family_links (organization_id,cost_master_item_id,family_id)
  select v_org,c.id,f.id
  from public.packaging_cost_master_items c
  join public.packaging_service_families f on f.organization_id=v_org
  where c.organization_id=v_org
    and (
      (c.code in ('MAT_BOPP_MATT_18','MAT_PET_12','MAT_METPET_12','MAT_CLEAR_PET_12','MAT_PE_60','MAT_PE_75','MAT_PE_95','MAT_PE_120','MAT_ADHESIVE','PROC_LAMINATION','PROC_SLITTING','PROC_POUCHING') and f.slug in ('standup-pouches','flat-bottom-pouches','center-seal-pouches','three-side-seal-pouches'))
      or (c.code in ('MAT_AL_FOIL_9','MAT_HOLOPET_12','MAT_PE_35','MAT_PE_40','MAT_PE_70') and f.slug in ('center-seal-pouches','three-side-seal-pouches'))
      or (c.code in ('PROC_PRINT_CMYKW','PROC_PRINT_CMYK') and f.slug in ('standup-pouches','flat-bottom-pouches'))
    )
  on conflict (organization_id,cost_master_item_id,family_id) do nothing;

  -- Charges: only zipper has a confirmed basis/rate/stage.
  insert into public.packaging_charge_master_items
    (organization_id,code,name,category,basis,application_stage,current_rate,currency,metadata)
  values
    (v_org,'EXTRA_ZIPPER','Zipper','extra','per_running_metre','before_wastage_margin',1.30,'INR','{}'),
    (v_org,'EXTRA_TEAR_NOTCH','Tear Notch','extra',null,null,null,'INR','{"rate_status":"required","basis_status":"required"}'),
    (v_org,'EXTRA_EURO_HOLE','Euro / Hang Hole','extra',null,null,null,'INR','{"rate_status":"required","basis_status":"required"}'),
    (v_org,'EXTRA_ROUNDED_CORNERS','Rounded Corners','extra',null,null,null,'INR','{"rate_status":"required","basis_status":"required"}'),
    (v_org,'EXTRA_VALVE','Valve','extra',null,null,null,'INR','{"rate_status":"required","basis_status":"required"}'),
    (v_org,'EXTRA_SPOT_UV','Spot UV','extra',null,null,null,'INR','{"rate_status":"required","basis_status":"required"}'),
    (v_org,'PRE_DESIGN','Design / Artwork','pre',null,null,null,'INR','{"rate_status":"required","basis_status":"required"}'),
    (v_org,'PRE_ARTWORK_AMEND','Artwork Amendments','pre',null,null,null,'INR','{"rate_status":"required","basis_status":"required"}'),
    (v_org,'PRE_CTP','CTP / Pre-press','pre',null,null,null,'INR','{"rate_status":"required","basis_status":"required"}'),
    (v_org,'POST_PACKING','Packing','post',null,null,null,'INR','{"rate_status":"required","basis_status":"required"}'),
    (v_org,'POST_DISPATCH','Dispatch / Handling','post',null,null,null,'INR','{"rate_status":"required","basis_status":"required"}'),
    (v_org,'POST_FREIGHT','Freight','post',null,null,null,'INR','{"rate_status":"required","basis_status":"required"}')
  on conflict (organization_id,code) do update set
    name=excluded.name,category=excluded.category,basis=excluded.basis,
    application_stage=excluded.application_stage,current_rate=excluded.current_rate,
    currency=excluded.currency,metadata=excluded.metadata,updated_at=now();

  insert into public.packaging_charge_master_family_links (organization_id,charge_master_item_id,family_id)
  select v_org,c.id,f.id
  from public.packaging_charge_master_items c
  join public.packaging_service_families f on f.organization_id=v_org
  where c.organization_id=v_org
    and (
      (c.code='EXTRA_ZIPPER' and f.slug in ('standup-pouches','flat-bottom-pouches'))
      or (c.code<>'EXTRA_ZIPPER' and f.slug in ('standup-pouches','flat-bottom-pouches','center-seal-pouches','three-side-seal-pouches'))
    )
  on conflict (organization_id,charge_master_item_id,family_id) do nothing;

  -- Draft v4 headers. is_active=false/status=draft means legacy v3 remains the only live route.
  insert into public.packaging_pricing_templates
    (organization_id,family_id,slug,name,description,currency,is_active,calculation_version,
     pricing_model,calculation_engine_key,status,production_rules_json,quote_config_json)
  values
    (v_org,v_sup,'stark-sup-formula-v4','Stark SUP Formula v4','Draft source-backed SUP formula recipe.','INR',false,4,'sup_standard_matrix','sup_formula','draft',
      '{"machine_width_mm":740,"machine_length_mm":1120,"trim_allowance_mm":20,"outer_print_web_mm":760,"inner_web_ladder":[{"required_max_mm":585,"stock_web_mm":590},{"required_max_mm":660,"stock_web_mm":670},{"stock_web_mm":770}],"pe_web_ladder":[{"required_max_mm":590,"stock_web_mm":595},{"required_max_mm":660,"stock_web_mm":675},{"stock_web_mm":775}],"round_frames_on_save":true}'::jsonb,
      '{"constructions":["glossy_foil","matte_foil","glossy_clear_window","matte_frosted_window"],"printing":["CMYK","CMYKW"],"gst_pct":18}'::jsonb),
    (v_org,v_center,'stark-center-seal-matrix-v4','Stark Center Seal Matrix v4','Draft matrix-per-frame template; full 96-row client workbook import pending.','INR',false,4,'legacy_dimensional','matrix_per_frame','draft',
      '{"machine_width_mm":740,"machine_length_mm":1120,"geometry":"center_seal_orientation_v1"}'::jsonb,
      '{"tiers":{"Q1":250,"Q2":500,"Q3":1000,"Q4":2000,"Q5":3000},"source_status":"full_workbook_required"}'::jsonb),
    (v_org,v_3ss,'stark-3ss-roll-matrix-v4','Stark 3SS Roll Matrix v4','Draft 3SS Roll matrix template; full 48-row client workbook import pending.','INR',false,4,'legacy_dimensional','matrix_per_frame','draft',
      '{"machine_width_mm":740,"machine_length_mm":1120,"geometry":"three_side_seal_roll_v1"}'::jsonb,
      '{"supply_form":"roll","tiers":{"Q1":250,"Q2":500,"Q3":1000,"Q4":2000,"Q5":3000},"source_status":"full_workbook_required"}'::jsonb),
    (v_org,v_3ss,'stark-3ss-pouch-matrix-v4','Stark 3SS Pouch Matrix v4','Draft 3SS Pouch matrix template; full 48-row client workbook import pending.','INR',false,4,'legacy_dimensional','matrix_per_frame','draft',
      '{"machine_width_mm":740,"machine_length_mm":1120,"geometry":"three_side_seal_pouch_v1","open_laminate_width_rule":"2*formed_height_mm+12"}'::jsonb,
      '{"supply_form":"pouch","tiers":{"Q1":250,"Q2":500,"Q3":1000,"Q4":2000,"Q5":3000},"source_status":"full_workbook_required"}'::jsonb)
  on conflict (organization_id,slug) do update set
    family_id=excluded.family_id,name=excluded.name,description=excluded.description,currency=excluded.currency,
    calculation_version=excluded.calculation_version,calculation_engine_key=excluded.calculation_engine_key,
    status=excluded.status,production_rules_json=excluded.production_rules_json,quote_config_json=excluded.quote_config_json,
    updated_at=now();

  select id into v_sup_template from public.packaging_pricing_templates where organization_id=v_org and slug='stark-sup-formula-v4';
  select id into v_center_template from public.packaging_pricing_templates where organization_id=v_org and slug='stark-center-seal-matrix-v4';
  select id into v_3ss_roll_template from public.packaging_pricing_templates where organization_id=v_org and slug='stark-3ss-roll-matrix-v4';
  select id into v_3ss_pouch_template from public.packaging_pricing_templates where organization_id=v_org and slug='stark-3ss-pouch-matrix-v4';

  -- SUP recipe items. Rates remain in Master rows; recipe stores only Master IDs and rules.
  insert into public.packaging_pricing_recipe_items
    (organization_id,template_id,construction_key,role_key,source_type,cost_master_item_id,consumption_rule_json,condition_json,sort_order,is_required)
  select v_org,v_sup_template,x.construction_key,x.role_key,'cost_master',c.id,x.rule_json,x.condition_json,x.sort_order,x.is_required
  from (values
    ('glossy_foil','outer_layer','MAT_PET_12','{"method":"gsm_stock_web"}'::jsonb,'{}'::jsonb,10,true),
    ('glossy_foil','middle_layer','MAT_METPET_12','{"method":"gsm_stock_web","web":"inner"}'::jsonb,'{}'::jsonb,20,true),
    ('matte_foil','outer_layer','MAT_BOPP_MATT_18','{"method":"gsm_stock_web","web":"outer"}'::jsonb,'{}'::jsonb,10,true),
    ('matte_foil','middle_layer','MAT_METPET_12','{"method":"gsm_stock_web","web":"inner"}'::jsonb,'{}'::jsonb,20,true),
    ('glossy_clear_window','outer_layer','MAT_PET_12','{"method":"gsm_stock_web"}'::jsonb,'{}'::jsonb,10,true),
    ('matte_frosted_window','outer_layer','MAT_BOPP_MATT_18','{"method":"gsm_stock_web","web":"outer"}'::jsonb,'{}'::jsonb,10,true),
    ('matte_frosted_window','middle_layer','MAT_CLEAR_PET_12','{"method":"gsm_stock_web","web":"inner"}'::jsonb,'{}'::jsonb,20,true),
    ('*','adhesive','MAT_ADHESIVE','{"method":"gsm_per_bond","bonds":"layer_count_minus_one","web":"pe"}'::jsonb,'{}'::jsonb,60,true),
    ('*','printing_cmyk','PROC_PRINT_CMYK','{"method":"per_frame"}'::jsonb,'{"print":"CMYK"}'::jsonb,70,false),
    ('*','printing_cmykw','PROC_PRINT_CMYKW','{"method":"per_frame"}'::jsonb,'{"print":"CMYKW"}'::jsonb,71,false),
    ('*','lamination','PROC_LAMINATION','{"method":"per_running_metre"}'::jsonb,'{}'::jsonb,80,true),
    ('*','slitting','PROC_SLITTING','{"method":"per_running_metre"}'::jsonb,'{}'::jsonb,90,true),
    ('*','pouching','PROC_POUCHING','{"method":"per_running_metre"}'::jsonb,'{}'::jsonb,100,true)
  ) as x(construction_key,role_key,code,rule_json,condition_json,sort_order,is_required)
  join public.packaging_cost_master_items c on c.organization_id=v_org and c.code=x.code
  on conflict do nothing;

  -- PE selection belongs to recipe conditions, never Product Variation.
  insert into public.packaging_pricing_recipe_items
    (organization_id,template_id,construction_key,role_key,source_type,cost_master_item_id,consumption_rule_json,condition_json,sort_order,is_required)
  select v_org,v_sup_template,'*','inner_pe','cost_master',c.id,'{"method":"gsm_stock_web","web":"pe"}'::jsonb,
         jsonb_build_object('variation_keys',x.variation_keys),50,true
  from (values
    ('MAT_PE_60',array['28g','50g','70g']::text[]),
    ('MAT_PE_75',array['100g','150g','200g','200_250g','250g']::text[]),
    ('MAT_PE_95',array['350g','500g','750_800g','750g_1kg','1kg','1_5kg']::text[]),
    ('MAT_PE_120',array['2kg']::text[])
  ) as x(code,variation_keys)
  join public.packaging_cost_master_items c on c.organization_id=v_org and c.code=x.code
  on conflict do nothing;

  insert into public.packaging_pricing_recipe_items
    (organization_id,template_id,construction_key,role_key,source_type,charge_master_item_id,consumption_rule_json,condition_json,sort_order,is_required)
  select v_org,v_sup_template,'*','zipper','charge_master',c.id,'{"method":"per_running_metre","metres":"repeat_x_pouches_per_frame"}'::jsonb,
         '{"quote_option":"zipper"}'::jsonb,110,false
  from public.packaging_charge_master_items c where c.organization_id=v_org and c.code='EXTRA_ZIPPER'
  on conflict do nothing;

  insert into public.packaging_pricing_commercial_bands
    (organization_id,template_id,run_length_max_m,wastage_pct,margin_per_frame,sort_order)
  values
    (v_org,v_sup_template,500,20,35,1),(v_org,v_sup_template,1000,10,25,2),
    (v_org,v_sup_template,2000,8,20,3),(v_org,v_sup_template,3000,7,17,4),
    (v_org,v_sup_template,5000,6,15,5),(v_org,v_sup_template,10000,5,13,6)
  on conflict (organization_id,template_id,run_length_max_m) do update set
    wastage_pct=excluded.wastage_pct,margin_per_frame=excluded.margin_per_frame,sort_order=excluded.sort_order,updated_at=now();

  -- Source-backed acceptance anchors only. They prove the matrix engine while
  -- keeping publication blocked until the complete 96+48+48 workbook is supplied.
  insert into public.packaging_pricing_matrix_rows
    (organization_id,template_id,supply_form,construction_key,client_product_id,width_mm,height_mm,
     q1_rate_per_frame,q2_rate_per_frame,q3_rate_per_frame,q4_rate_per_frame,q5_rate_per_frame,
     source_worksheet,source_reference,metadata)
  values
    (v_org,v_center_template,'center_seal','2 layer - 12 pet + 35 PE - Roll form','SPPL78',100,140,110,105,85,79.5,74.5,'Center Seal','handoff acceptance anchor','{"seed_scope":"anchor_only"}'),
    (v_org,v_3ss_roll_template,'three_side_seal_roll','SPPL174','SPPL174',null,null,110,105,85,79.5,74.5,'3SS Roll','handoff acceptance anchor','{"seed_scope":"anchor_only"}'),
    (v_org,v_3ss_pouch_template,'three_side_seal_pouch','SPPL222','SPPL222',null,null,120,115,99.8,92.27,86.225,'3SS Pouch','handoff acceptance anchor','{"seed_scope":"anchor_only"}')
  on conflict (organization_id,template_id,supply_form,client_product_id) do update set
    construction_key=excluded.construction_key,width_mm=excluded.width_mm,height_mm=excluded.height_mm,
    q1_rate_per_frame=excluded.q1_rate_per_frame,q2_rate_per_frame=excluded.q2_rate_per_frame,
    q3_rate_per_frame=excluded.q3_rate_per_frame,q4_rate_per_frame=excluded.q4_rate_per_frame,
    q5_rate_per_frame=excluded.q5_rate_per_frame,source_worksheet=excluded.source_worksheet,
    source_reference=excluded.source_reference,metadata=excluded.metadata,updated_at=now();
end $$;

commit;
