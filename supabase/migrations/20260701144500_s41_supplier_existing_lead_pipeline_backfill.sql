-- Sprint 41: move existing supplier leads off legacy supplier pipelines and onto the canonical Supplier Journey Pipeline.
-- Safe to run repeatedly. Buyer pipelines/leads are intentionally untouched.

with canonical_pipeline as (
  select distinct on (organization_id)
    id,
    organization_id
  from public.pipelines
  where lead_type = 'supplier'
    and lower(name) = 'supplier journey pipeline'
  order by organization_id, is_default desc, created_at asc nulls last
), legacy_supplier_stages as (
  select
    l.organization_id,
    l.id as lead_id,
    old_stage.id as old_stage_id,
    lower(trim(old_stage.name)) as old_stage_name,
    cp.id as new_pipeline_id,
    case
      when lower(trim(old_stage.name)) in ('new lead', 'new supplier inquiry', 'new booth lead', 'new supplier') then 'new supplier'
      when lower(trim(old_stage.name)) in ('qualified', 'qualified after show', 'capability review', 'profile review') then 'profile review'
      when lower(trim(old_stage.name)) in ('samples / documents', 'documents requested') then 'documents requested'
      when lower(trim(old_stage.name)) in ('sampling', 'samples reviewed', 'supplier quote options', 'quote sent') then 'cost / sample requested'
      when lower(trim(old_stage.name)) in ('negotiation', 'follow-up scheduled') then 'response received'
      when lower(trim(old_stage.name)) in ('approved', 'approved supplier', 'won', 'converted after upgrade') then 'approved supplier'
      when lower(trim(old_stage.name)) in ('rejected', 'lost') then 'rejected supplier'
      when lower(trim(old_stage.name)) in ('inactive', 'inactive supplier') then 'inactive supplier'
      else 'profile review'
    end as new_stage_name
  from public.leads l
  join public.pipelines old_pipeline on old_pipeline.id = l.pipeline_id
  left join public.pipeline_stages old_stage on old_stage.id = l.stage_id
  join canonical_pipeline cp on cp.organization_id = l.organization_id
  where l.lead_type = 'supplier'
    and old_pipeline.lead_type = 'supplier'
    and old_pipeline.id <> cp.id
), mapped as (
  select
    legacy.organization_id,
    legacy.lead_id,
    legacy.new_pipeline_id,
    new_stage.id as new_stage_id
  from legacy_supplier_stages legacy
  join public.pipeline_stages new_stage
    on new_stage.pipeline_id = legacy.new_pipeline_id
   and lower(trim(new_stage.name)) = legacy.new_stage_name
)
update public.leads l
set
  pipeline_id = mapped.new_pipeline_id,
  stage_id = mapped.new_stage_id,
  updated_at = now()
from mapped
where l.id = mapped.lead_id
  and l.organization_id = mapped.organization_id
  and l.lead_type = 'supplier'
  and (l.pipeline_id is distinct from mapped.new_pipeline_id or l.stage_id is distinct from mapped.new_stage_id);
