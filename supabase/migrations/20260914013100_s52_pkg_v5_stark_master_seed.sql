-- S52-PKG-V5-002
-- Stark Packmate v5 template, 20 workbook sizes, missing materials, and 5 bucket commercial rules.
begin;

do $$
declare
  v_org constant uuid := 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
  v_sup uuid;
  v_template uuid;
begin
  select id into v_sup from public.packaging_service_families where organization_id=v_org and slug='standup-pouches';
  if v_sup is null then raise exception 'Stand Up Pouches family is required before Pricing v5 can be seeded.'; end if;

  insert into public.packaging_cost_master_items
    (organization_id,code,name,item_type,specification,rate_basis,current_rate,rate_uom,currency,micron,gsm,density,metadata)
  values
    (v_org,'MAT_SATIN_MATT_PET_12','12 Satin Matt PET','material','12 micron Satin Matt PET','per_kg',null,'kg','INR',12,null,1.4,'{"rate_status":"required","pricing_v5_source":"SUP quote model (2).xlsx"}'::jsonb),
    (v_org,'MAT_VELVET_PET_15','15 Velvet PET','material','15 micron Velvet Touch PET','per_kg',null,'kg','INR',15,null,1.4,'{"rate_status":"required","pricing_v5_source":"SUP quote model (2).xlsx"}'::jsonb),
    (v_org,'MAT_HOLO_METPET_12','12 Holo MetPET','material','12 micron holographic MetPET','per_kg',null,'kg','INR',12,null,1.4,'{"rate_status":"required","pricing_v5_source":"SUP quote model (2).xlsx"}'::jsonb)
  on conflict(organization_id,code) do nothing;

  insert into public.packaging_pricing_templates
    (organization_id,family_id,slug,name,description,currency,is_active,calculation_version,pricing_model,calculation_engine_key,status,production_rules_json,quote_config_json)
  values
    (v_org,v_sup,'stark-sup-formula-v5','Stark SUP Formula v5','Draft September 2026 workbook-backed SUP engine. Additive to v4.','INR',false,5,
     'sup_standard_matrix','sup_formula_v5','draft',
     '{"machine_width_mm":740,"machine_length_mm":1120,"trim_allowance_mm":20,"gusset_trim_allowance_mm":3,"outer_print_web_mm":760,"inner_web_ladder":[{"required_max_mm":585,"stock_web_mm":590},{"required_max_mm":660,"stock_web_mm":670},{"stock_web_mm":770}],"pe_web_ladder":[{"required_max_mm":590,"stock_web_mm":595},{"required_max_mm":660,"stock_web_mm":675},{"stock_web_mm":775}],"lamination_rate_by_layer_count":{"3":5,"4":7.5}}'::jsonb,
     '{"source_workbook":"SUP quote model (2).xlsx","source_date":"2026-09-04","construction_count":44,"size_count":20,"gst_pct":18}'::jsonb)
  on conflict(organization_id,slug) do update set
    name=excluded.name,description=excluded.description,calculation_version=excluded.calculation_version,
    pricing_model=excluded.pricing_model,calculation_engine_key=excluded.calculation_engine_key,
    production_rules_json=excluded.production_rules_json,quote_config_json=excluded.quote_config_json,updated_at=now();

  select id into v_template from public.packaging_pricing_templates where organization_id=v_org and slug='stark-sup-formula-v5';

  insert into public.packaging_size_profiles_v5
    (organization_id,family_id,size_key,name,width_mm,height_mm,bottom_gusset_each_mm,pricing_bucket,production_profile_key,gusset_production_mode,bottom_registration_mode,is_active,is_quoteable,sort_order,metadata)
  select v_org,v_sup,s.size_key,s.name,s.width_mm,s.height_mm,s.bg_each,s.bucket,
         case when s.width_mm=110 and s.height_mm=170 then 'sup_110x170_conditional' when s.width_mm in(260,280) then 'sup_split_gusset_large' else 'sup_integrated' end,
         case when s.width_mm=110 and s.height_mm=170 then 'conditional' when s.width_mm in(260,280) then 'separate' else 'integrated' end,
         case when s.width_mm=110 and s.height_mm=170 then 'optional' else 'not_applicable' end,
         true,false,s.sort_order,jsonb_build_object('source_worksheet','Sizes','source_row',s.source_row)
  from(values
    ('80x130_bg25_25','80mm x 130mm (25mm + 25mm bg)',80::numeric,130::numeric,25::numeric,1::smallint,1,3),
    ('98x150_bg30_30','98mm x 150mm (30mm + 30mm bg)',98,150,30,1,2,4),
    ('110x170_bg30_30','110mm x 170mm (30mm + 30mm bg)',110,170,30,2,3,5),
    ('150x150_bg40_40','150mm x 150mm (40mm + 40mm bg)',150,150,40,2,4,6),
    ('120x210_bg40_40','120mm x 210mm (40mm + 40mm bg)',120,210,40,3,5,7),
    ('125x210_bg40_40','125mm x 210mm (40mm + 40mm bg)',125,210,40,3,6,8),
    ('130x210_bg40_40','130mm x 210mm (40mm + 40mm bg)',130,210,40,3,7,9),
    ('140x210_bg40_40','140mm x 210mm (40mm + 40mm bg)',140,210,40,3,8,10),
    ('145x210_bg40_40','145mm x 210mm (40mm + 40mm bg)',145,210,40,3,9,11),
    ('150x220_bg50_50','150mm x 220mm (50mm + 50mm bg)',150,220,50,3,10,12),
    ('160x240_bg50_50','160mm x 240mm (50mm + 50mm bg)',160,240,50,3,11,13),
    ('170x250_bg50_50','170mm x 250mm (50mm + 50mm bg)',170,250,50,3,12,14),
    ('185x270_bg50_50','185mm x 270mm (50mm + 50mm bg)',185,270,50,3,13,15),
    ('200x300_bg55_55','200mm x 300mm (55mm + 55mm bg)',200,300,55,4,14,16),
    ('210x300_bg55_55','210mm x 300mm (55mm + 55mm bg)',210,300,55,4,15,17),
    ('220x300_bg55_55','220mm x 300mm (55mm + 55mm bg)',220,300,55,4,16,18),
    ('230x310_bg55_55','230mm x 310mm (55mm + 55mm bg)',230,310,55,4,17,19),
    ('245x320_bg55_55','245mm x 320mm (55mm + 55mm bg)',245,320,55,4,18,20),
    ('260x340_bg60_60','260mm x 340mm (60mm + 60mm bg)',260,340,60,5,19,21),
    ('280x360_bg60_60','280mm x 360mm (60mm + 60mm bg)',280,360,60,5,20,22)
  ) as s(size_key,name,width_mm,height_mm,bg_each,bucket,sort_order,source_row)
  on conflict(organization_id,family_id,size_key) do update set
    name=excluded.name,width_mm=excluded.width_mm,height_mm=excluded.height_mm,bottom_gusset_each_mm=excluded.bottom_gusset_each_mm,
    pricing_bucket=excluded.pricing_bucket,production_profile_key=excluded.production_profile_key,gusset_production_mode=excluded.gusset_production_mode,
    bottom_registration_mode=excluded.bottom_registration_mode,sort_order=excluded.sort_order,metadata=excluded.metadata,updated_at=now();

  insert into public.packaging_pricing_commercial_bands_v5
    (organization_id,template_id,pricing_bucket,run_length_max_m,wastage_pct,margin_per_frame,sort_order,metadata)
  select v_org,v_template,b.bucket,b.run_max,b.waste,b.margin,b.sort_order,jsonb_build_object('source_worksheet','Wastages and margins','source_row',b.source_row)
  from(values
    (1::smallint,500::numeric,20::numeric,70::numeric,1,3),(1,1000,10,60,2,4),(1,2000,8,50,3,5),(1,3000,7,40,4,6),(1,5000,6,30,5,7),(1,10000,5,25,6,8),
    (2,250,25,70,1,12),(2,500,20,70,2,13),(2,1000,10,60,3,14),(2,2000,8,50,4,15),(2,3000,7,40,5,16),(2,5000,6,30,6,17),(2,10000,5,25,7,18),
    (3,250,25,35,1,22),(3,500,20,35,2,23),(3,1000,10,25,3,24),(3,2000,8,20,4,25),(3,3000,7,17,5,26),(3,5000,6,15,6,27),(3,10000,5,13,7,28),
    (4,250,25,35,1,32),(4,500,20,35,2,33),(4,1000,10,25,3,34),(4,2000,8,20,4,35),(4,3000,7,17,5,36),(4,5000,6,15,6,37),(4,10000,5,13,7,38),
    (5,250,25,35,1,42),(5,500,20,35,2,43),(5,1000,10,25,3,44),(5,2000,8,20,4,45),(5,3000,7,17,5,46),(5,5000,6,15,6,47),(5,10000,5,13,7,48)
  ) as b(bucket,run_max,waste,margin,sort_order,source_row)
  on conflict(organization_id,template_id,pricing_bucket,run_length_max_m) do update set
    wastage_pct=excluded.wastage_pct,margin_per_frame=excluded.margin_per_frame,sort_order=excluded.sort_order,metadata=excluded.metadata,updated_at=now();
end $$;

commit;
