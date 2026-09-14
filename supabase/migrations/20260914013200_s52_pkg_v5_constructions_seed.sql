-- S52-PKG-V5-003
-- 11 construction families x PE60/75/95/120 = 44 workbook combinations.
begin;

do $$
declare
  v_org constant uuid := 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
  v_sup uuid;
begin
  select id into v_sup from public.packaging_service_families where organization_id=v_org and slug='standup-pouches';
  if v_sup is null then raise exception 'Stand Up Pouches family is required.'; end if;

  with family_def as (
    select * from(values
      ('glossy_clear_window','Glossy clear window','glossy','clear',2,'MAT_CLEAR_PET_12',null::text,null::text,3),
      ('matte_frosted_window','Matte Finish With Frosted Window','matte','clear',3,'MAT_BOPP_MATT_18','MAT_PET_12',null,8),
      ('glossy_metpet','Glossy Finish With Metpet (Silver film)','glossy','silver',3,'MAT_PET_12','MAT_METPET_12',null,13),
      ('matte_metpet','Matt Finish With Metpet (Silver film)','matte','silver',3,'MAT_BOPP_MATT_18','MAT_METPET_12',null,18),
      ('glossy_al_foil','Glossy Finish With Aluminium Foil (High barrier)','glossy','high_barrier',3,'MAT_PET_12','MAT_AL_FOIL_9',null,23),
      ('glossy_al_foil_double_pet','Glossy Finish With Aluminium Foil (High barrier) - Double PET','glossy','high_barrier',4,'MAT_PET_12','MAT_AL_FOIL_9','MAT_PET_12',28),
      ('matte_al_foil','Matt Finish With Aluminium Foil (High barrier)','matte','high_barrier',4,'MAT_BOPP_MATT_18','MAT_PET_12','MAT_AL_FOIL_9',33),
      ('satin_matt_metpet','Satin Matt Finish With Metpet (Silver film)','satin_matt','silver',3,'MAT_SATIN_MATT_PET_12','MAT_METPET_12',null,38),
      ('velvet_matt_metpet','Velvet touch Matt Finish With Metpet (Silver film)','velvet_matt','silver',3,'MAT_VELVET_PET_15','MAT_METPET_12',null,43),
      ('glossy_holo_metpet','Glossy Finish With Holo Metpet (Holo rainbow film)','glossy','holographic',3,'MAT_PET_12','MAT_HOLOPET_12',null,48),
      ('matte_holo_metpet','Matt Finish With Holo Metpet (Holo rainbow film)','matte','holographic',3,'MAT_BOPP_MATT_18','MAT_HOLOPET_12',null,53)
    ) as f(family_key,family_name,finish_type,barrier_type,layer_count,l1,l2,l3,source_row)
  ), sealant as (
    select * from(values
      ('pe60','MAT_PE_60',60,0),('pe75','MAT_PE_75',75,1),('pe95','MAT_PE_95',95,2),('pe120','MAT_PE_120',120,3)
    ) as p(sealant_key,sealant_code,micron,offset_row)
  )
  insert into public.packaging_constructions_v5
    (organization_id,family_id,construction_key,construction_family_key,name,finish_type,barrier_type,sealant_code,layer_count,is_active,is_quoteable,sort_order,metadata)
  select v_org,v_sup,f.family_key||'_'||p.sealant_key,f.family_key,f.family_name||' / PE'||p.micron,
         f.finish_type,f.barrier_type,p.sealant_code,f.layer_count,true,false,f.source_row+p.offset_row,
         jsonb_build_object('source_worksheet','Construction','source_row',f.source_row+p.offset_row)
  from family_def f cross join sealant p
  on conflict(organization_id,family_id,construction_key) do update set
    name=excluded.name,finish_type=excluded.finish_type,barrier_type=excluded.barrier_type,sealant_code=excluded.sealant_code,
    layer_count=excluded.layer_count,sort_order=excluded.sort_order,metadata=excluded.metadata,updated_at=now();

  delete from public.packaging_construction_layers_v5
   where organization_id=v_org and construction_id in(select id from public.packaging_constructions_v5 where organization_id=v_org and family_id=v_sup);

  with family_layers as (
    select * from(values
      ('glossy_clear_window',1,'print_layer','MAT_CLEAR_PET_12',true,false),
      ('matte_frosted_window',1,'print_layer','MAT_BOPP_MATT_18',true,false),('matte_frosted_window',2,'middle_layer_1','MAT_PET_12',false,false),
      ('glossy_metpet',1,'print_layer','MAT_PET_12',true,false),('glossy_metpet',2,'middle_layer_1','MAT_METPET_12',false,false),
      ('matte_metpet',1,'print_layer','MAT_BOPP_MATT_18',true,false),('matte_metpet',2,'middle_layer_1','MAT_METPET_12',false,false),
      ('glossy_al_foil',1,'print_layer','MAT_PET_12',true,false),('glossy_al_foil',2,'middle_layer_1','MAT_AL_FOIL_9',false,false),
      ('glossy_al_foil_double_pet',1,'print_layer','MAT_PET_12',true,false),('glossy_al_foil_double_pet',2,'middle_layer_1','MAT_AL_FOIL_9',false,false),('glossy_al_foil_double_pet',3,'middle_layer_2','MAT_PET_12',false,false),
      ('matte_al_foil',1,'print_layer','MAT_BOPP_MATT_18',true,false),('matte_al_foil',2,'middle_layer_1','MAT_PET_12',false,false),('matte_al_foil',3,'middle_layer_2','MAT_AL_FOIL_9',false,false),
      ('satin_matt_metpet',1,'print_layer','MAT_SATIN_MATT_PET_12',true,false),('satin_matt_metpet',2,'middle_layer_1','MAT_METPET_12',false,false),
      ('velvet_matt_metpet',1,'print_layer','MAT_VELVET_PET_15',true,false),('velvet_matt_metpet',2,'middle_layer_1','MAT_METPET_12',false,false),
      ('glossy_holo_metpet',1,'print_layer','MAT_PET_12',true,false),('glossy_holo_metpet',2,'middle_layer_1','MAT_HOLOPET_12',false,false),
      ('matte_holo_metpet',1,'print_layer','MAT_BOPP_MATT_18',true,false),('matte_holo_metpet',2,'middle_layer_1','MAT_HOLOPET_12',false,false)
    ) as x(family_key,layer_position,role_key,material_code,is_print_layer,is_sealant_layer)
  )
  insert into public.packaging_construction_layers_v5
    (organization_id,construction_id,layer_position,role_key,cost_master_item_id,is_print_layer,is_sealant_layer)
  select v_org,c.id,l.layer_position,l.role_key,m.id,l.is_print_layer,l.is_sealant_layer
  from public.packaging_constructions_v5 c
  join family_layers l on l.family_key=c.construction_family_key
  join public.packaging_cost_master_items m on m.organization_id=v_org and m.code=l.material_code
  where c.organization_id=v_org and c.family_id=v_sup;

  insert into public.packaging_construction_layers_v5
    (organization_id,construction_id,layer_position,role_key,cost_master_item_id,is_print_layer,is_sealant_layer)
  select v_org,c.id,c.layer_count,'sealant_layer',m.id,false,true
  from public.packaging_constructions_v5 c
  join public.packaging_cost_master_items m on m.organization_id=v_org and m.code=c.sealant_code
  where c.organization_id=v_org and c.family_id=v_sup;
end $$;

commit;
