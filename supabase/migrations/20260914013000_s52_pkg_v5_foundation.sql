-- S52-PKG-V5-001 / S52-PKG-V5-002
-- Additive Stark Packmate Pricing v5 foundation.
-- IMPORTANT: v4 tables, templates, feature flag and quote routing remain intact.

begin;

-- Allow a new template engine key without changing existing v4 rows.
alter table public.packaging_pricing_templates
  drop constraint if exists packaging_pricing_templates_v4_engine_key_check;

alter table public.packaging_pricing_templates
  add constraint packaging_pricing_templates_v4_engine_key_check
  check (
    calculation_engine_key is null
    or calculation_engine_key in ('sup_formula', 'sup_formula_v5', 'matrix_per_frame', 'service_formula')
  );

-- ---------------------------------------------------------------------------
-- V5-approved SUP sizes. Kept separate from v4 product_variations so the
-- September workbook can be validated without changing any live v4 selection.
-- ---------------------------------------------------------------------------
create table if not exists public.packaging_size_profiles_v5 (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  family_id uuid not null,
  size_key text not null,
  name text not null,
  width_mm numeric not null,
  height_mm numeric not null,
  bottom_gusset_each_mm numeric not null default 0,
  pricing_bucket smallint not null,
  production_profile_key text,
  gusset_production_mode text not null default 'integrated',
  bottom_registration_mode text not null default 'not_applicable',
  is_active boolean not null default true,
  is_quoteable boolean not null default false,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packaging_size_profiles_v5_family_org_fkey
    foreign key (organization_id, family_id)
    references public.packaging_service_families(organization_id, id)
    on delete cascade,
  constraint packaging_size_profiles_v5_dimensions_check
    check (width_mm > 0 and height_mm > 0 and bottom_gusset_each_mm >= 0),
  constraint packaging_size_profiles_v5_bucket_check
    check (pricing_bucket between 1 and 5),
  constraint packaging_size_profiles_v5_gusset_mode_check
    check (gusset_production_mode in ('integrated','separate','conditional')),
  constraint packaging_size_profiles_v5_registration_mode_check
    check (bottom_registration_mode in ('not_applicable','optional','required_registered','required_unregistered')),
  unique (organization_id, family_id, size_key),
  unique (organization_id, id)
);

-- ---------------------------------------------------------------------------
-- Dynamic construction catalog. 44 September workbook combinations are seeded
-- below from 11 construction families x PE60/75/95/120.
-- ---------------------------------------------------------------------------
create table if not exists public.packaging_constructions_v5 (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  family_id uuid not null,
  construction_key text not null,
  construction_family_key text not null,
  name text not null,
  finish_type text,
  barrier_type text,
  sealant_code text not null,
  layer_count smallint not null,
  is_active boolean not null default true,
  is_quoteable boolean not null default false,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packaging_constructions_v5_family_org_fkey
    foreign key (organization_id, family_id)
    references public.packaging_service_families(organization_id, id)
    on delete cascade,
  constraint packaging_constructions_v5_layer_count_check check (layer_count between 2 and 6),
  unique (organization_id, family_id, construction_key),
  unique (organization_id, id)
);

create table if not exists public.packaging_construction_layers_v5 (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  construction_id uuid not null,
  layer_position smallint not null,
  role_key text not null,
  cost_master_item_id uuid not null,
  is_print_layer boolean not null default false,
  is_sealant_layer boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint packaging_construction_layers_v5_construction_org_fkey
    foreign key (organization_id, construction_id)
    references public.packaging_constructions_v5(organization_id, id)
    on delete cascade,
  constraint packaging_construction_layers_v5_cost_org_fkey
    foreign key (organization_id, cost_master_item_id)
    references public.packaging_cost_master_items(organization_id, id)
    on delete restrict,
  constraint packaging_construction_layers_v5_position_check check (layer_position > 0),
  unique (organization_id, construction_id, layer_position),
  unique (organization_id, id)
);

-- V5 commercial rules are separate from v4 bands so current v4 Admin and
-- calculation semantics cannot be changed by this migration.
create table if not exists public.packaging_pricing_commercial_bands_v5 (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid not null,
  pricing_bucket smallint not null,
  run_length_max_m numeric not null,
  wastage_pct numeric not null,
  margin_per_frame numeric not null,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packaging_pricing_commercial_bands_v5_template_org_fkey
    foreign key (organization_id, template_id)
    references public.packaging_pricing_templates(organization_id, id)
    on delete cascade,
  constraint packaging_pricing_commercial_bands_v5_bucket_check check (pricing_bucket between 1 and 5),
  constraint packaging_pricing_commercial_bands_v5_run_check check (run_length_max_m > 0),
  constraint packaging_pricing_commercial_bands_v5_wastage_check check (wastage_pct between 0 and 100),
  constraint packaging_pricing_commercial_bands_v5_margin_check check (margin_per_frame >= 0),
  unique (organization_id, template_id, pricing_bucket, run_length_max_m),
  unique (organization_id, id)
);

-- Missing September materials are added as Rate Required. Existing v4 rates are
-- not overwritten because the workbook/transcript do not provide a single clean
-- authoritative rate for every new material.
insert into public.packaging_cost_master_items
  (organization_id,code,name,item_type,specification,rate_basis,current_rate,rate_uom,currency,micron,gsm,density,metadata)
select o.id, v.code, v.name, 'material', v.specification, 'per_kg', null, 'kg', 'INR', v.micron, null, v.density,
       jsonb_build_object('rate_status','required','pricing_v5_source','SUP quote model (2).xlsx')
from public.organizations o
cross join (values
  ('MAT_SATIN_MATT_PET_12','12 Satin Matt PET','12 micron Satin Matt PET',12::numeric,1.4::numeric),
  ('MAT_VELVET_PET_15','15 Velvet PET','15 micron Velvet Touch PET',15::numeric,1.4::numeric),
  ('MAT_HOLO_METPET_12','12 Holo MetPET','12 micron holographic MetPET',12::numeric,1.4::numeric)
) as v(code,name,specification,micron,density)
where o.id = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
on conflict (organization_id,code) do nothing;

-- Add a draft V5 template only. No routing is enabled here.
do $$
declare
  v_org constant uuid := 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
  v_sup uuid;
  v_template uuid;
begin
  select id into v_sup
  from public.packaging_service_families
  where organization_id=v_org and slug='standup-pouches';

  if v_sup is null then
    raise exception 'Stand Up Pouches family is required before Pricing v5 can be seeded.';
  end if;

  insert into public.packaging_pricing_templates
    (organization_id,family_id,slug,name,description,currency,is_active,calculation_version,
     pricing_model,calculation_engine_key,status,production_rules_json,quote_config_json)
  values
    (v_org,v_sup,'stark-sup-formula-v5','Stark SUP Formula v5',
     'Draft September 2026 workbook-backed SUP engine. Additive to v4.',
     'INR',false,5,'sup_formula_v5','sup_formula_v5','draft',
     '{"machine_width_mm":740,"machine_length_mm":1120,"trim_allowance_mm":20,"gusset_trim_allowance_mm":3,"outer_print_web_mm":760,"inner_web_ladder":[{"required_max_mm":585,"stock_web_mm":590},{"required_max_mm":660,"stock_web_mm":670},{"stock_web_mm":770}],"pe_web_ladder":[{"required_max_mm":590,"stock_web_mm":595},{"required_max_mm":660,"stock_web_mm":675},{"stock_web_mm":775}],"lamination_rate_by_layer_count":{"3":5,"4":7.5}}'::jsonb,
     '{"source_workbook":"SUP quote model (2).xlsx","source_date":"2026-09-04","construction_count":44,"size_count":20}'::jsonb)
  on conflict (organization_id,slug) do update set
    name=excluded.name,
    description=excluded.description,
    calculation_version=excluded.calculation_version,
    calculation_engine_key=excluded.calculation_engine_key,
    production_rules_json=excluded.production_rules_json,
    quote_config_json=excluded.quote_config_json,
    updated_at=now();

  select id into v_template
  from public.packaging_pricing_templates
  where organization_id=v_org and slug='stark-sup-formula-v5';

  -- Workbook Sizes worksheet: blank bucket cells inherit the heading above them.
  insert into public.packaging_size_profiles_v5
    (organization_id,family_id,size_key,name,width_mm,height_mm,bottom_gusset_each_mm,pricing_bucket,
     production_profile_key,gusset_production_mode,bottom_registration_mode,is_active,is_quoteable,sort_order,metadata)
  select v_org,v_sup,s.size_key,s.name,s.width_mm,s.height_mm,s.bg_each,s.bucket,
         case
           when s.width_mm=110 and s.height_mm=170 then 'sup_110x170_conditional'
           when s.width_mm in (260,280) then 'sup_split_gusset_large'
           else 'sup_integrated'
         end,
         case
           when s.width_mm=110 and s.height_mm=170 then 'conditional'
           when s.width_mm in (260,280) then 'separate'
           else 'integrated'
         end,
         case when s.width_mm=110 and s.height_mm=170 then 'optional' else 'not_applicable' end,
         true,false,s.sort_order,
         jsonb_build_object('source_worksheet','Sizes','source_row',s.source_row)
  from (values
    ('80x130_bg25_25','80mm x 130mm x (25mm +25mm bg)',80::numeric,130::numeric,25::numeric,1::smallint,1,3),
    ('98x150_bg30_30','98mm x 150mm x (30mm +30mm bg)',98,150,30,1,2,4),
    ('110x170_bg30_30','110mm x 170mm x (30mm +30mm bg)',110,170,30,2,3,5),
    ('150x150_bg40_40','150mm x 150mm x (40mm +40mm bg)',150,150,40,2,4,6),
    ('120x210_bg40_40','120mm x 210mm x (40mm +40mm bg)',120,210,40,3,5,7),
    ('125x210_bg40_40','125mm x 210mm x (40mm +40mm bg)',125,210,40,3,6,8),
    ('130x210_bg40_40','130mm x 210mm x (40mm +40mm bg)',130,210,40,3,7,9),
    ('140x210_bg40_40','140mm x 210mm x (40mm +40mm bg)',140,210,40,3,8,10),
    ('145x210_bg40_40','145mm x 210mm x (40mm +40mm bg)',145,210,40,3,9,11),
    ('150x220_bg50_50','150mm x 220mm x (50mm +50mm bg)',150,220,50,3,10,12),
    ('160x240_bg50_50','160mm x 240mm x (50mm +50mm bg)',160,240,50,3,11,13),
    ('170x250_bg50_50','170mm x 250mm x (50mm +50mm bg)',170,250,50,3,12,14),
    ('185x270_bg50_50','185mm x 270mm x (50mm +50mm bg)',185,270,50,3,13,15),
    ('200x300_bg55_55','200mm x 300mm x (55mm +55mm bg)',200,300,55,4,14,16),
    ('210x300_bg55_55','210mm x 300mm x (55mm +55mm bg)',210,300,55,4,15,17),
    ('220x300_bg55_55','220mm x 300mm x (55mm +55mm bg)',220,300,55,4,16,18),
    ('230x310_bg55_55','230mm x 310mm x (55mm +55mm bg)',230,310,55,4,17,19),
    ('245x320_bg55_55','245mm x 320mm x (55mm +55mm bg)',245,320,55,4,18,20),
    ('260x340_bg60_60','260mm x 340mm x (60mm +60mm bg)',260,340,60,5,19,21),
    ('280x360_bg60_60','280mm x 360mm x (60mm +60mm bg)',280,360,60,5,20,22)
  ) as s(size_key,name,width_mm,height_mm,bg_each,bucket,sort_order,source_row)
  on conflict (organization_id,family_id,size_key) do update set
    name=excluded.name,width_mm=excluded.width_mm,height_mm=excluded.height_mm,
    bottom_gusset_each_mm=excluded.bottom_gusset_each_mm,pricing_bucket=excluded.pricing_bucket,
    production_profile_key=excluded.production_profile_key,gusset_production_mode=excluded.gusset_production_mode,
    bottom_registration_mode=excluded.bottom_registration_mode,sort_order=excluded.sort_order,
    metadata=excluded.metadata,updated_at=now();

  -- 11 construction families x four sealant gauges = 44 workbook combinations.
  with family_def as (
    select * from (values
      ('glossy_clear_window','Glossy clear window','glossy','clear',2,'MAT_PET_12',null::text,null::text,3),
      ('matte_frosted_window','Matte Finish With Frosted Window','matte','clear',3,'MAT_BOPP_MATT_18','MAT_PET_12',null,8),
      ('glossy_metpet','Glossy Finish With Metpet (Silver film)','glossy','silver',3,'MAT_PET_12','MAT_METPET_12',null,13),
      ('matte_metpet','Matt Finish With Metpet (Silver film)','matte','silver',3,'MAT_BOPP_MATT_18','MAT_METPET_12',null,18),
      ('glossy_al_foil','Glossy Finish With Aluminium Foil (High barrier)','glossy','high_barrier',3,'MAT_PET_12','MAT_AL_FOIL_9',null,23),
      ('glossy_al_foil_double_pet','Glossy Finish With Aluminium Foil (High barrier) - Double PET','glossy','high_barrier',4,'MAT_PET_12','MAT_AL_FOIL_9','MAT_PET_12',28),
      ('matte_al_foil','Matt Finish With Aluminium Foil (High barrier)','matte','high_barrier',4,'MAT_BOPP_MATT_18','MAT_PET_12','MAT_AL_FOIL_9',33),
      ('satin_matt_metpet','Satin Matt Finish With Metpet (Silver film)','satin_matt','silver',3,'MAT_SATIN_MATT_PET_12','MAT_METPET_12',null,38),
      ('velvet_matt_metpet','Velvet touch Matt Finish With Metpet (Silver film)','velvet_matt','silver',3,'MAT_VELVET_PET_15','MAT_METPET_12',null,43),
      ('glossy_holo_metpet','Glossy Finish With Holo Metpet (Holo rainbow film)','glossy','holographic',3,'MAT_PET_12','MAT_HOLO_METPET_12',null,48),
      ('matte_holo_metpet','Matt Finish With Holo Metpet (Holo rainbow film)','matte','holographic',3,'MAT_BOPP_MATT_18','MAT_HOLO_METPET_12',null,53)
    ) as f(family_key,family_name,finish_type,barrier_type,layer_count,l1,l2,l3,source_row)
  ), sealant as (
    select * from (values
      ('pe60','MAT_PE_60',60,0),('pe75','MAT_PE_75',75,1),('pe95','MAT_PE_95',95,2),('pe120','MAT_PE_120',120,3)
    ) as p(sealant_key,sealant_code,micron,offset_row)
  )
  insert into public.packaging_constructions_v5
    (organization_id,family_id,construction_key,construction_family_key,name,finish_type,barrier_type,
     sealant_code,layer_count,is_active,is_quoteable,sort_order,metadata)
  select v_org,v_sup,
         f.family_key||'_'||p.sealant_key,
         f.family_key,
         f.family_name||' / PE'||p.micron,
         f.finish_type,f.barrier_type,p.sealant_code,f.layer_count,
         true,false,
         f.source_row + p.offset_row,
         jsonb_build_object('source_worksheet','Construction','source_row',f.source_row+p.offset_row)
  from family_def f cross join sealant p
  on conflict (organization_id,family_id,construction_key) do update set
    name=excluded.name,finish_type=excluded.finish_type,barrier_type=excluded.barrier_type,
    sealant_code=excluded.sealant_code,layer_count=excluded.layer_count,sort_order=excluded.sort_order,
    metadata=excluded.metadata,updated_at=now();

  -- Rebuild v5 construction layers from the workbook definitions. This only
  -- touches the new V5 layer table.
  delete from public.packaging_construction_layers_v5
  where organization_id=v_org
    and construction_id in (
      select id from public.packaging_constructions_v5 where organization_id=v_org and family_id=v_sup
    );

  with family_layers as (
    select * from (values
      ('glossy_clear_window',1,'print_layer','MAT_PET_12',true,false),
      ('matte_frosted_window',1,'print_layer','MAT_BOPP_MATT_18',true,false),('matte_frosted_window',2,'middle_layer_1','MAT_PET_12',false,false),
      ('glossy_metpet',1,'print_layer','MAT_PET_12',true,false),('glossy_metpet',2,'middle_layer_1','MAT_METPET_12',false,false),
      ('matte_metpet',1,'print_layer','MAT_BOPP_MATT_18',true,false),('matte_metpet',2,'middle_layer_1','MAT_METPET_12',false,false),
      ('glossy_al_foil',1,'print_layer','MAT_PET_12',true,false),('glossy_al_foil',2,'middle_layer_1','MAT_AL_FOIL_9',false,false),
      ('glossy_al_foil_double_pet',1,'print_layer','MAT_PET_12',true,false),('glossy_al_foil_double_pet',2,'middle_layer_1','MAT_AL_FOIL_9',false,false),('glossy_al_foil_double_pet',3,'middle_layer_2','MAT_PET_12',false,false),
      ('matte_al_foil',1,'print_layer','MAT_BOPP_MATT_18',true,false),('matte_al_foil',2,'middle_layer_1','MAT_PET_12',false,false),('matte_al_foil',3,'middle_layer_2','MAT_AL_FOIL_9',false,false),
      ('satin_matt_metpet',1,'print_layer','MAT_SATIN_MATT_PET_12',true,false),('satin_matt_metpet',2,'middle_layer_1','MAT_METPET_12',false,false),
      ('velvet_matt_metpet',1,'print_layer','MAT_VELVET_PET_15',true,false),('velvet_matt_metpet',2,'middle_layer_1','MAT_METPET_12',false,false),
      ('glossy_holo_metpet',1,'print_layer','MAT_PET_12',true,false),('glossy_holo_metpet',2,'middle_layer_1','MAT_HOLO_METPET_12',false,false),
      ('matte_holo_metpet',1,'print_layer','MAT_BOPP_MATT_18',true,false),('matte_holo_metpet',2,'middle_layer_1','MAT_HOLO_METPET_12',false,false)
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

  -- September workbook commercial tables. Buckets 3/4/5 intentionally carry
  -- identical source values but remain distinct editable rows.
  insert into public.packaging_pricing_commercial_bands_v5
    (organization_id,template_id,pricing_bucket,run_length_max_m,wastage_pct,margin_per_frame,sort_order,metadata)
  select v_org,v_template,b.bucket,b.run_max,b.waste,b.margin,b.sort_order,
         jsonb_build_object('source_worksheet','Wastages and margins','source_row',b.source_row)
  from (values
    (1::smallint,500::numeric,20::numeric,70::numeric,1,3),(1,1000,10,60,2,4),(1,2000,8,50,3,5),(1,3000,7,40,4,6),(1,5000,6,30,5,7),(1,10000,5,25,6,8),
    (2,250,25,70,1,12),(2,500,20,70,2,13),(2,1000,10,60,3,14),(2,2000,8,50,4,15),(2,3000,7,40,5,16),(2,5000,6,30,6,17),(2,10000,5,25,7,18),
    (3,250,25,35,1,22),(3,500,20,35,2,23),(3,1000,10,25,3,24),(3,2000,8,20,4,25),(3,3000,7,17,5,26),(3,5000,6,15,6,27),(3,10000,5,13,7,28),
    (4,250,25,35,1,32),(4,500,20,35,2,33),(4,1000,10,25,3,34),(4,2000,8,20,4,35),(4,3000,7,17,5,36),(4,5000,6,15,6,37),(4,10000,5,13,7,38),
    (5,250,25,35,1,42),(5,500,20,35,2,43),(5,1000,10,25,3,44),(5,2000,8,20,4,45),(5,3000,7,17,5,46),(5,5000,6,15,6,47),(5,10000,5,13,7,48)
  ) as b(bucket,run_max,waste,margin,sort_order,source_row)
  on conflict (organization_id,template_id,pricing_bucket,run_length_max_m) do update set
    wastage_pct=excluded.wastage_pct,margin_per_frame=excluded.margin_per_frame,
    sort_order=excluded.sort_order,metadata=excluded.metadata,updated_at=now();
end $$;

-- RLS: V5 sizes may be read by org members for controlled future Sales use.
-- Constructions/layers/bands remain Admin-only until a redacted server projection
-- is introduced in a later V5 batch.
alter table public.packaging_size_profiles_v5 enable row level security;
alter table public.packaging_constructions_v5 enable row level security;
alter table public.packaging_construction_layers_v5 enable row level security;
alter table public.packaging_pricing_commercial_bands_v5 enable row level security;

create policy packaging_size_profiles_v5_member_read
  on public.packaging_size_profiles_v5 for select to authenticated
  using (public.is_org_member(organization_id));
create policy packaging_size_profiles_v5_admin_all
  on public.packaging_size_profiles_v5 for all to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy packaging_constructions_v5_admin_all
  on public.packaging_constructions_v5 for all to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy packaging_construction_layers_v5_admin_all
  on public.packaging_construction_layers_v5 for all to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy packaging_pricing_commercial_bands_v5_admin_all
  on public.packaging_pricing_commercial_bands_v5 for all to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

grant select,insert,update,delete on public.packaging_size_profiles_v5 to authenticated;
grant select,insert,update,delete on public.packaging_constructions_v5 to authenticated;
grant select,insert,update,delete on public.packaging_construction_layers_v5 to authenticated;
grant select,insert,update,delete on public.packaging_pricing_commercial_bands_v5 to authenticated;

create index if not exists idx_packaging_size_profiles_v5_org_family
  on public.packaging_size_profiles_v5(organization_id,family_id,is_active,sort_order);
create index if not exists idx_packaging_constructions_v5_org_family
  on public.packaging_constructions_v5(organization_id,family_id,is_active,sort_order);
create index if not exists idx_packaging_construction_layers_v5_construction
  on public.packaging_construction_layers_v5(organization_id,construction_id,layer_position);
create index if not exists idx_packaging_commercial_bands_v5_lookup
  on public.packaging_pricing_commercial_bands_v5(organization_id,template_id,pricing_bucket,run_length_max_m);

insert into public.smc_feature_flags
  (flag_key,name,description,enabled,rollout_percentage,allowed_orgs,blocked_orgs)
values
  ('packaging_pricing_v5','Packaging Pricing v5',
   'September 2026 workbook-backed SUP pricing engine. Additive to v4; disabled until explicit UAT cutover.',
   false,0,array['b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid],array[]::uuid[])
on conflict (flag_key) do update set
  name=excluded.name,
  description=excluded.description,
  enabled=false,
  rollout_percentage=0,
  allowed_orgs=excluded.allowed_orgs,
  updated_at=now();

commit;
