-- Stark Packmate Pricing V5 production hotfix:
-- 20 SUP sizes receive 20 independent commercial pricing buckets.
-- Center Seal uses dedicated PG21; 3 Side Seal uses dedicated PG22.
-- Starting waste/margin schedules are copied from each size/family's current bucket.

create temporary table _stark_sup_band_source on commit drop as
select b.*
from public.packaging_pricing_commercial_bands_v5 b
join public.packaging_pricing_templates t on t.id=b.template_id
join public.organizations o on o.id=t.organization_id
where o.name='Stark Packmate'
  and t.slug='stark-sup-formula-v5'
  and b.pricing_bucket between 1 and 5;

do $$
declare
  v_org uuid;
  v_sup uuid;
  v_size_count integer;
  v_source_band_count integer;
begin
  select id into v_org from public.organizations where name='Stark Packmate' limit 1;
  if v_org is null then raise exception 'Stark Packmate organization not found'; end if;

  select id into v_sup
  from public.packaging_pricing_templates
  where organization_id=v_org and slug='stark-sup-formula-v5'
  limit 1;
  if v_sup is null then raise exception 'Stark SUP V5 template not found'; end if;

  select count(*) into v_size_count
  from public.packaging_size_profiles_v5
  where organization_id=v_org and template_id=v_sup and is_active=true;
  if v_size_count <> 20 then
    raise exception 'Expected 20 active Stark SUP sizes, found %', v_size_count;
  end if;

  select count(*) into v_source_band_count from _stark_sup_band_source;
  if v_source_band_count < 1 then
    raise exception 'Stark SUP source pricing buckets were not found';
  end if;
end $$;

delete from public.packaging_pricing_commercial_bands_v5 b
using public.packaging_pricing_templates t, public.organizations o
where b.template_id=t.id
  and t.organization_id=o.id
  and o.name='Stark Packmate'
  and t.slug='stark-sup-formula-v5';

with ranked_sizes as (
  select
    s.id,
    s.organization_id,
    s.template_id,
    s.pricing_bucket as source_bucket,
    row_number() over(order by s.sort_order,s.id)::smallint as new_bucket
  from public.packaging_size_profiles_v5 s
  join public.packaging_pricing_templates t on t.id=s.template_id
  join public.organizations o on o.id=s.organization_id
  where o.name='Stark Packmate'
    and t.slug='stark-sup-formula-v5'
    and s.is_active=true
)
insert into public.packaging_pricing_commercial_bands_v5
  (organization_id,template_id,pricing_bucket,run_length_max_m,wastage_pct,margin_per_frame,sort_order,metadata,created_by,updated_by,created_at,updated_at)
select
  rs.organization_id,
  rs.template_id,
  rs.new_bucket,
  src.run_length_max_m,
  src.wastage_pct,
  src.margin_per_frame,
  src.sort_order,
  coalesce(src.metadata,'{}'::jsonb) || jsonb_build_object(
    'hotfix_source','2026-09-29_size_specific_buckets',
    'copied_from_bucket',rs.source_bucket
  ),
  src.created_by,
  src.updated_by,
  now(),
  now()
from ranked_sizes rs
join _stark_sup_band_source src
  on src.template_id=rs.template_id and src.pricing_bucket=rs.source_bucket;

with ranked_sizes as (
  select
    s.id,
    s.pricing_bucket as source_bucket,
    row_number() over(order by s.sort_order,s.id)::smallint as new_bucket
  from public.packaging_size_profiles_v5 s
  join public.packaging_pricing_templates t on t.id=s.template_id
  join public.organizations o on o.id=s.organization_id
  where o.name='Stark Packmate'
    and t.slug='stark-sup-formula-v5'
    and s.is_active=true
)
update public.packaging_size_profiles_v5 s
set pricing_bucket=rs.new_bucket,
    metadata=coalesce(s.metadata,'{}'::jsonb) || jsonb_build_object(
      'pricing_bucket_source',rs.source_bucket,
      'pricing_bucket_assignment','size_specific_2026_09_29'
    ),
    updated_at=now()
from ranked_sizes rs
where s.id=rs.id;

create temporary table _stark_center_band_source on commit drop as
select b.*
from public.packaging_pricing_commercial_bands_v5 b
join public.packaging_pricing_templates t on t.id=b.template_id
join public.organizations o on o.id=t.organization_id
where o.name='Stark Packmate'
  and t.slug in ('stark-center-seal-pouch-v5-review','stark-center-seal-roll-v5-review')
  and b.pricing_bucket=3;

delete from public.packaging_pricing_commercial_bands_v5 b
using public.packaging_pricing_templates t, public.organizations o
where b.template_id=t.id
  and t.organization_id=o.id
  and o.name='Stark Packmate'
  and t.slug in ('stark-center-seal-pouch-v5-review','stark-center-seal-roll-v5-review');

insert into public.packaging_pricing_commercial_bands_v5
  (organization_id,template_id,pricing_bucket,run_length_max_m,wastage_pct,margin_per_frame,sort_order,metadata,created_by,updated_by,created_at,updated_at)
select
  src.organization_id,
  src.template_id,
  21,
  src.run_length_max_m,
  src.wastage_pct,
  src.margin_per_frame,
  src.sort_order,
  coalesce(src.metadata,'{}'::jsonb) || jsonb_build_object(
    'hotfix_source','2026-09-29_family_specific_buckets',
    'copied_from_bucket',3,
    'bucket_label','Center Seal'
  ),
  src.created_by,
  src.updated_by,
  now(),
  now()
from _stark_center_band_source src;

update public.packaging_pricing_templates t
set production_rules_json=
      jsonb_set(
        jsonb_set(coalesce(t.production_rules_json,'{}'::jsonb),'{default_commercial_bucket}','21'::jsonb,true),
        '{commercial_bucket_mapping}','"dedicated_center_seal_pg21"'::jsonb,true
      )
      || jsonb_build_object('bucket_review_note','Dedicated Center Seal commercial bucket. Waste and margin can be managed independently from SUP and 3SS.'),
    updated_at=now()
from public.organizations o
where t.organization_id=o.id
  and o.name='Stark Packmate'
  and t.slug in ('stark-center-seal-pouch-v5-review','stark-center-seal-roll-v5-review');

create temporary table _stark_3ss_band_source on commit drop as
select b.*
from public.packaging_pricing_commercial_bands_v5 b
join public.packaging_pricing_templates t on t.id=b.template_id
join public.organizations o on o.id=t.organization_id
where o.name='Stark Packmate'
  and t.slug in ('stark-3ss-pouch-v5-review','stark-3ss-roll-v5-review')
  and b.pricing_bucket=2;

delete from public.packaging_pricing_commercial_bands_v5 b
using public.packaging_pricing_templates t, public.organizations o
where b.template_id=t.id
  and t.organization_id=o.id
  and o.name='Stark Packmate'
  and t.slug in ('stark-3ss-pouch-v5-review','stark-3ss-roll-v5-review');

insert into public.packaging_pricing_commercial_bands_v5
  (organization_id,template_id,pricing_bucket,run_length_max_m,wastage_pct,margin_per_frame,sort_order,metadata,created_by,updated_by,created_at,updated_at)
select
  src.organization_id,
  src.template_id,
  22,
  src.run_length_max_m,
  src.wastage_pct,
  src.margin_per_frame,
  src.sort_order,
  coalesce(src.metadata,'{}'::jsonb) || jsonb_build_object(
    'hotfix_source','2026-09-29_family_specific_buckets',
    'copied_from_bucket',2,
    'bucket_label','3 Side Seal'
  ),
  src.created_by,
  src.updated_by,
  now(),
  now()
from _stark_3ss_band_source src;

update public.packaging_pricing_templates t
set production_rules_json=
      jsonb_set(
        jsonb_set(coalesce(t.production_rules_json,'{}'::jsonb),'{default_commercial_bucket}','22'::jsonb,true),
        '{commercial_bucket_mapping}','"dedicated_3ss_pg22"'::jsonb,true
      )
      || jsonb_build_object('bucket_review_note','Dedicated 3 Side Seal commercial bucket. Waste and margin can be managed independently from SUP and Center Seal.'),
    updated_at=now()
from public.organizations o
where t.organization_id=o.id
  and o.name='Stark Packmate'
  and t.slug in ('stark-3ss-pouch-v5-review','stark-3ss-roll-v5-review');

do $$
declare
  v_sup_groups integer;
  v_sup_sizes integer;
  v_center_bad integer;
  v_3ss_bad integer;
begin
  select count(distinct b.pricing_bucket) into v_sup_groups
  from public.packaging_pricing_commercial_bands_v5 b
  join public.packaging_pricing_templates t on t.id=b.template_id
  join public.organizations o on o.id=t.organization_id
  where o.name='Stark Packmate' and t.slug='stark-sup-formula-v5';

  select count(*) into v_sup_sizes
  from public.packaging_size_profiles_v5 s
  join public.packaging_pricing_templates t on t.id=s.template_id
  join public.organizations o on o.id=s.organization_id
  where o.name='Stark Packmate' and t.slug='stark-sup-formula-v5' and s.is_active=true
    and s.pricing_bucket between 1 and 20;

  select count(*) into v_center_bad
  from public.packaging_pricing_templates t
  join public.organizations o on o.id=t.organization_id
  where o.name='Stark Packmate'
    and t.slug in ('stark-center-seal-pouch-v5-review','stark-center-seal-roll-v5-review')
    and coalesce((t.production_rules_json->>'default_commercial_bucket')::int,0)<>21;

  select count(*) into v_3ss_bad
  from public.packaging_pricing_templates t
  join public.organizations o on o.id=t.organization_id
  where o.name='Stark Packmate'
    and t.slug in ('stark-3ss-pouch-v5-review','stark-3ss-roll-v5-review')
    and coalesce((t.production_rules_json->>'default_commercial_bucket')::int,0)<>22;

  if v_sup_groups<>20 or v_sup_sizes<>20 or v_center_bad<>0 or v_3ss_bad<>0 then
    raise exception 'Pricing bucket hotfix verification failed: sup_groups %, sup_sizes %, center_bad %, 3ss_bad %',
      v_sup_groups,v_sup_sizes,v_center_bad,v_3ss_bad;
  end if;
end $$;
