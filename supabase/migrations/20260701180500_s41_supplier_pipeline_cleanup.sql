-- Sprint 41 Supplier Pipeline Cleanup
-- Keeps Supplier Journey Pipeline as the only active supplier board pipeline per org.
-- Legacy supplier pipelines are deleted after supplier leads and stage-history
-- references are remapped to the canonical Supplier Journey Pipeline.

with canonical_pipeline as (
  select distinct on (organization_id)
    id,
    organization_id
  from public.pipelines
  where lead_type = 'supplier'
    and lower(trim(name)) = 'supplier journey pipeline'
  order by organization_id, is_default desc, created_at asc nulls last
), legacy_stages as (
  select
    old_stage.id as old_stage_id,
    old_pipeline.organization_id,
    cp.id as canonical_pipeline_id,
    case
      when lower(trim(old_stage.name)) in ('new lead', 'new supplier inquiry', 'new booth lead', 'new supplier') then 'new supplier'
      when lower(trim(old_stage.name)) in ('qualified', 'qualified after show', 'capability review', 'profile review') then 'profile review'
      when lower(trim(old_stage.name)) in ('samples / documents', 'documents requested', 'compliance review') then 'documents requested'
      when lower(trim(old_stage.name)) in ('sampling', 'samples reviewed', 'supplier quote options', 'quote sent', 'cost / sample requested') then 'cost / sample requested'
      when lower(trim(old_stage.name)) in ('negotiation', 'follow-up scheduled', 'response received') then 'response received'
      when lower(trim(old_stage.name)) in ('approved', 'approved supplier', 'won', 'converted after upgrade') then 'approved supplier'
      when lower(trim(old_stage.name)) in ('rejected', 'lost', 'rejected supplier') then 'rejected supplier'
      when lower(trim(old_stage.name)) in ('inactive', 'inactive supplier') then 'inactive supplier'
      else 'profile review'
    end as canonical_stage_name
  from public.pipeline_stages old_stage
  join public.pipelines old_pipeline on old_pipeline.id = old_stage.pipeline_id
  join canonical_pipeline cp on cp.organization_id = old_pipeline.organization_id
  where old_pipeline.lead_type = 'supplier'
    and old_pipeline.id <> cp.id
), stage_map as (
  select
    legacy.old_stage_id,
    canonical_stage.id as canonical_stage_id,
    legacy.organization_id,
    legacy.canonical_pipeline_id
  from legacy_stages legacy
  join public.pipeline_stages canonical_stage
    on canonical_stage.pipeline_id = legacy.canonical_pipeline_id
   and lower(trim(canonical_stage.name)) = legacy.canonical_stage_name
)
update public.leads l
set
  pipeline_id = stage_map.canonical_pipeline_id,
  stage_id = stage_map.canonical_stage_id,
  updated_at = now()
from stage_map
where l.lead_type = 'supplier'
  and l.organization_id = stage_map.organization_id
  and l.stage_id = stage_map.old_stage_id;

with canonical_pipeline as (
  select distinct on (organization_id)
    id,
    organization_id
  from public.pipelines
  where lead_type = 'supplier'
    and lower(trim(name)) = 'supplier journey pipeline'
  order by organization_id, is_default desc, created_at asc nulls last
), legacy_stages as (
  select
    old_stage.id as old_stage_id,
    old_pipeline.organization_id,
    cp.id as canonical_pipeline_id,
    case
      when lower(trim(old_stage.name)) in ('new lead', 'new supplier inquiry', 'new booth lead', 'new supplier') then 'new supplier'
      when lower(trim(old_stage.name)) in ('qualified', 'qualified after show', 'capability review', 'profile review') then 'profile review'
      when lower(trim(old_stage.name)) in ('samples / documents', 'documents requested', 'compliance review') then 'documents requested'
      when lower(trim(old_stage.name)) in ('sampling', 'samples reviewed', 'supplier quote options', 'quote sent', 'cost / sample requested') then 'cost / sample requested'
      when lower(trim(old_stage.name)) in ('negotiation', 'follow-up scheduled', 'response received') then 'response received'
      when lower(trim(old_stage.name)) in ('approved', 'approved supplier', 'won', 'converted after upgrade') then 'approved supplier'
      when lower(trim(old_stage.name)) in ('rejected', 'lost', 'rejected supplier') then 'rejected supplier'
      when lower(trim(old_stage.name)) in ('inactive', 'inactive supplier') then 'inactive supplier'
      else 'profile review'
    end as canonical_stage_name
  from public.pipeline_stages old_stage
  join public.pipelines old_pipeline on old_pipeline.id = old_stage.pipeline_id
  join canonical_pipeline cp on cp.organization_id = old_pipeline.organization_id
  where old_pipeline.lead_type = 'supplier'
    and old_pipeline.id <> cp.id
), stage_map as (
  select legacy.old_stage_id, canonical_stage.id as canonical_stage_id, legacy.organization_id
  from legacy_stages legacy
  join public.pipeline_stages canonical_stage
    on canonical_stage.pipeline_id = legacy.canonical_pipeline_id
   and lower(trim(canonical_stage.name)) = legacy.canonical_stage_name
)
update public.lead_stage_history h
set from_stage_id = stage_map.canonical_stage_id
from stage_map
where h.organization_id = stage_map.organization_id
  and h.from_stage_id = stage_map.old_stage_id;

with canonical_pipeline as (
  select distinct on (organization_id)
    id,
    organization_id
  from public.pipelines
  where lead_type = 'supplier'
    and lower(trim(name)) = 'supplier journey pipeline'
  order by organization_id, is_default desc, created_at asc nulls last
), legacy_stages as (
  select
    old_stage.id as old_stage_id,
    old_pipeline.organization_id,
    cp.id as canonical_pipeline_id,
    case
      when lower(trim(old_stage.name)) in ('new lead', 'new supplier inquiry', 'new booth lead', 'new supplier') then 'new supplier'
      when lower(trim(old_stage.name)) in ('qualified', 'qualified after show', 'capability review', 'profile review') then 'profile review'
      when lower(trim(old_stage.name)) in ('samples / documents', 'documents requested', 'compliance review') then 'documents requested'
      when lower(trim(old_stage.name)) in ('sampling', 'samples reviewed', 'supplier quote options', 'quote sent', 'cost / sample requested') then 'cost / sample requested'
      when lower(trim(old_stage.name)) in ('negotiation', 'follow-up scheduled', 'response received') then 'response received'
      when lower(trim(old_stage.name)) in ('approved', 'approved supplier', 'won', 'converted after upgrade') then 'approved supplier'
      when lower(trim(old_stage.name)) in ('rejected', 'lost', 'rejected supplier') then 'rejected supplier'
      when lower(trim(old_stage.name)) in ('inactive', 'inactive supplier') then 'inactive supplier'
      else 'profile review'
    end as canonical_stage_name
  from public.pipeline_stages old_stage
  join public.pipelines old_pipeline on old_pipeline.id = old_stage.pipeline_id
  join canonical_pipeline cp on cp.organization_id = old_pipeline.organization_id
  where old_pipeline.lead_type = 'supplier'
    and old_pipeline.id <> cp.id
), stage_map as (
  select legacy.old_stage_id, canonical_stage.id as canonical_stage_id, legacy.organization_id
  from legacy_stages legacy
  join public.pipeline_stages canonical_stage
    on canonical_stage.pipeline_id = legacy.canonical_pipeline_id
   and lower(trim(canonical_stage.name)) = legacy.canonical_stage_name
)
update public.lead_stage_history h
set to_stage_id = stage_map.canonical_stage_id
from stage_map
where h.organization_id = stage_map.organization_id
  and h.to_stage_id = stage_map.old_stage_id;

update public.pipelines p
set is_default = true
where p.lead_type = 'supplier'
  and lower(trim(p.name)) = 'supplier journey pipeline';

update public.pipelines p
set is_default = false
where p.lead_type = 'supplier'
  and lower(trim(p.name)) <> 'supplier journey pipeline';

with canonical_order(stage_name, sort_order, is_closed, is_won, is_lost) as (
  values
    ('new supplier', 10, false, false, false),
    ('profile review', 20, false, false, false),
    ('capability mapped', 30, false, false, false),
    ('documents requested', 40, false, false, false),
    ('compliance review', 50, false, false, false),
    ('cost / sample requested', 60, false, false, false),
    ('response received', 70, false, false, false),
    ('approved supplier', 80, true, true, false),
    ('rejected supplier', 90, true, false, true),
    ('inactive supplier', 100, true, false, true)
)
update public.pipeline_stages ps
set
  sort_order = canonical_order.sort_order,
  is_closed = canonical_order.is_closed,
  is_won = canonical_order.is_won,
  is_lost = canonical_order.is_lost
from public.pipelines p, canonical_order
where ps.pipeline_id = p.id
  and lower(trim(ps.name)) = canonical_order.stage_name
  and p.lead_type = 'supplier'
  and lower(trim(p.name)) = 'supplier journey pipeline';

delete from public.pipeline_stages ps
using public.pipelines p
where ps.pipeline_id = p.id
  and p.lead_type = 'supplier'
  and lower(trim(p.name)) <> 'supplier journey pipeline'
  and not exists (select 1 from public.leads l where l.stage_id = ps.id)
  and not exists (select 1 from public.lead_stage_history h where h.from_stage_id = ps.id or h.to_stage_id = ps.id);

delete from public.pipelines p
where p.lead_type = 'supplier'
  and lower(trim(p.name)) <> 'supplier journey pipeline'
  and not exists (select 1 from public.leads l where l.pipeline_id = p.id)
  and not exists (select 1 from public.pipeline_stages ps where ps.pipeline_id = p.id);
