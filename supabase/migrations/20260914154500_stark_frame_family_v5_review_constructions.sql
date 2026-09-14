-- Review-only migration of Stark Center Seal / 3SS construction structures into Pricing v5.
-- Nothing here activates or publishes a template. Existing v4 remains the live fallback.
begin;

with mapping(review_slug, source_slug) as (
  values
    ('stark-center-seal-roll-v5-review','stark-center-seal-matrix-v4'),
    ('stark-center-seal-pouch-v5-review','stark-center-seal-matrix-v4'),
    ('stark-3ss-roll-v5-review','stark-3ss-roll-matrix-v4'),
    ('stark-3ss-pouch-v5-review','stark-3ss-pouch-matrix-v4')
), source_rows as (
  select distinct
    rt.organization_id,
    rt.id as review_template_id,
    rt.family_id,
    rt.slug as review_slug,
    r.construction_key
  from mapping m
  join public.packaging_pricing_templates rt on rt.slug=m.review_slug
  join public.packaging_pricing_templates st on st.organization_id=rt.organization_id and st.slug=m.source_slug
  join public.packaging_pricing_matrix_rows r on r.organization_id=st.organization_id and r.template_id=st.id
  where rt.organization_id='b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
    and (
      (m.review_slug like '%-roll-%' and lower(r.construction_key) like '%roll form%') or
      (m.review_slug like '%-pouch-%' and lower(r.construction_key) like '%pouch form%')
    )
)
insert into public.packaging_constructions_v5(
  organization_id,template_id,family_id,construction_key,construction_family_key,name,
  finish_type,barrier_type,sealant_code,layer_count,is_active,is_quoteable,sort_order,metadata
)
select
  s.organization_id,s.review_template_id,s.family_id,s.construction_key,'v4_matrix_migration',s.construction_key,
  case when lower(s.construction_key) like '%matt%' then 'matte' else 'gloss' end,
  case
    when lower(s.construction_key) like '%al foil%' then 'foil'
    when lower(s.construction_key) like '%metpet%' then 'metallized'
    when lower(s.construction_key) like '%holopet%' then 'holographic'
    else 'standard'
  end,
  case
    when lower(s.construction_key) like '%120 pe%' then 'MAT_PE_120'
    when lower(s.construction_key) like '%95 pe%' then 'MAT_PE_95'
    when lower(s.construction_key) like '%75 pe%' then 'MAT_PE_75'
    when lower(s.construction_key) like '%60 pe%' then 'MAT_PE_60'
    when lower(s.construction_key) like '%40 pe%' then 'MAT_PE_40'
    when lower(s.construction_key) like '%35 pe%' then 'MAT_PE_35'
    else 'MAT_PE_75'
  end,
  split_part(s.construction_key,' ',1)::smallint,
  true,false,row_number() over(partition by s.review_template_id order by s.construction_key)::int,
  jsonb_build_object('source','stark_v4_workbook_baseline','review_only',true,'source_construction_key',s.construction_key)
from source_rows s
on conflict (organization_id,template_id,construction_key) do nothing;

with construction_materials as (
  select c.*,
    lower(c.name) as lname,
    case
      when lower(c.name) like '%120 pe%' then 'MAT_PE_120'
      when lower(c.name) like '%95 pe%' then 'MAT_PE_95'
      when lower(c.name) like '%75 pe%' then 'MAT_PE_75'
      when lower(c.name) like '%60 pe%' then 'MAT_PE_60'
      when lower(c.name) like '%40 pe%' then 'MAT_PE_40'
      when lower(c.name) like '%35 pe%' then 'MAT_PE_35'
      else 'MAT_PE_75'
    end as sealant_master_code
  from public.packaging_constructions_v5 c
  join public.packaging_pricing_templates t on t.id=c.template_id and t.organization_id=c.organization_id
  where c.organization_id='b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
    and t.slug in (
      'stark-center-seal-roll-v5-review','stark-center-seal-pouch-v5-review',
      'stark-3ss-roll-v5-review','stark-3ss-pouch-v5-review'
    )
), layer_plan as (
  select c.organization_id,c.template_id,c.id as construction_id,p.pos,p.code,
    case when p.pos=1 then 'outer_print' when p.pos=c.layer_count then 'sealant' else 'barrier' end as role_key,
    (p.pos=1) as is_print_layer,(p.pos=c.layer_count) as is_sealant_layer
  from construction_materials c
  cross join lateral (
    values
      (1, case when c.lname like '%18 matt bopp%' then 'MAT_BOPP_MATT_18' else 'MAT_PET_12' end),
      (2, case
            when c.layer_count=2 then c.sealant_master_code
            when c.lname like '%clearpet%' then 'MAT_CLEAR_PET_12'
            when c.lname like '%holopet%' then 'MAT_HOLOPET_12'
            when c.lname like '%metpet%' then 'MAT_METPET_12'
            when c.layer_count=3 and c.lname like '%al foil%' then 'MAT_AL_FOIL_9'
            when c.layer_count=4 then 'MAT_PET_12'
            else 'MAT_PET_12' end),
      (3, case when c.layer_count=3 then c.sealant_master_code when c.layer_count=4 then 'MAT_AL_FOIL_9' else null end),
      (4, case when c.layer_count=4 then c.sealant_master_code else null end)
  ) as p(pos,code)
  where p.pos<=c.layer_count and p.code is not null
)
insert into public.packaging_construction_layers_v5(
  organization_id,template_id,construction_id,layer_position,role_key,cost_master_item_id,is_print_layer,is_sealant_layer
)
select lp.organization_id,lp.template_id,lp.construction_id,lp.pos,lp.role_key,m.id,lp.is_print_layer,lp.is_sealant_layer
from layer_plan lp
join public.packaging_cost_master_items m on m.organization_id=lp.organization_id and m.code=lp.code and m.is_active=true
on conflict (organization_id,construction_id,layer_position) do nothing;

commit;
