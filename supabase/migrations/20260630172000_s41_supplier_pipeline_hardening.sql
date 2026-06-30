-- Sprint 41 Supplier Journey Workflow
-- S41-SUP-005 / S41-SUP-006
-- Keep supplier leads out of buyer-only pipelines, seed a supplier-native pipeline, and make the guard idempotent.

create or replace function public.setuflow_enforce_lead_pipeline_journey()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pipeline_journey text;
  stage_pipeline_id uuid;
begin
  new.lead_type := lower(trim(coalesce(new.lead_type, '')));

  if new.lead_type not in ('buyer', 'supplier') then
    raise exception 'Lead type must be buyer or supplier before a pipeline can be assigned.';
  end if;

  if new.stage_id is not null then
    select ps.pipeline_id
      into stage_pipeline_id
      from public.pipeline_stages ps
     where ps.id = new.stage_id;

    if stage_pipeline_id is null then
      raise exception 'Selected stage is not available.';
    end if;

    if new.pipeline_id is not null and stage_pipeline_id <> new.pipeline_id then
      raise exception 'Selected stage does not belong to the selected pipeline.';
    end if;

    if new.pipeline_id is null then
      new.pipeline_id := stage_pipeline_id;
    end if;
  end if;

  if new.pipeline_id is not null then
    select lower(trim(coalesce(p.lead_type, '')))
      into pipeline_journey
      from public.pipelines p
     where p.id = new.pipeline_id
       and p.organization_id = new.organization_id;

    if pipeline_journey is null then
      raise exception 'Selected pipeline is not available in the active organization.';
    end if;

    if pipeline_journey not in (new.lead_type, 'both') then
      raise exception 'Selected pipeline is not configured for % lead workflow.', new.lead_type;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists setuflow_enforce_lead_pipeline_journey on public.leads;

create trigger setuflow_enforce_lead_pipeline_journey
before insert or update of lead_type, pipeline_id, stage_id, organization_id
on public.leads
for each row
execute function public.setuflow_enforce_lead_pipeline_journey();

with orgs as (
  select id as organization_id
    from public.organizations
), inserted_pipelines as (
  insert into public.pipelines (id, organization_id, name, lead_type, is_default, created_at, updated_at)
  select gen_random_uuid(), orgs.organization_id, 'Supplier Journey Pipeline', 'supplier', true, now(), now()
    from orgs
   where not exists (
     select 1
       from public.pipelines existing
      where existing.organization_id = orgs.organization_id
        and lower(existing.lead_type) = 'supplier'
        and lower(existing.name) = 'supplier journey pipeline'
   )
  returning id, organization_id
), canonical_supplier_pipelines as (
  select id, organization_id
    from inserted_pipelines
  union all
  select id, organization_id
    from public.pipelines
   where lower(lead_type) = 'supplier'
     and lower(name) = 'supplier journey pipeline'
)
update public.pipelines p
   set is_default = (p.id = c.id),
       updated_at = now()
  from canonical_supplier_pipelines c
 where p.organization_id = c.organization_id
   and lower(p.lead_type) = 'supplier';

with canonical_supplier_pipelines as (
  select id as pipeline_id
    from public.pipelines
   where lower(lead_type) = 'supplier'
     and lower(name) = 'supplier journey pipeline'
), supplier_stages as (
  select * from (values
    ('New Supplier', 10, '#0ea5e9', false, false, false),
    ('Profile Review', 20, '#6366f1', false, false, false),
    ('Capability Mapped', 30, '#8b5cf6', false, false, false),
    ('Documents Requested', 40, '#f59e0b', false, false, false),
    ('Compliance Review', 50, '#ec4899', false, false, false),
    ('Cost / Sample Requested', 60, '#14b8a6', false, false, false),
    ('Response Received', 70, '#22c55e', false, false, false),
    ('Approved Supplier', 80, '#16a34a', true, true, false),
    ('Rejected Supplier', 90, '#ef4444', true, false, true),
    ('Inactive Supplier', 100, '#64748b', true, false, true)
  ) as stage(name, sort_order, color, is_closed, is_won, is_lost)
), upserted as (
  insert into public.pipeline_stages (id, pipeline_id, name, sort_order, color, is_closed, is_won, is_lost, created_at, updated_at)
  select gen_random_uuid(), c.pipeline_id, s.name, s.sort_order, s.color, s.is_closed, s.is_won, s.is_lost, now(), now()
    from canonical_supplier_pipelines c
   cross join supplier_stages s
   where not exists (
     select 1
       from public.pipeline_stages existing
      where existing.pipeline_id = c.pipeline_id
        and lower(existing.name) = lower(s.name)
   )
  returning id
)
update public.pipeline_stages ps
   set sort_order = s.sort_order,
       color = s.color,
       is_closed = s.is_closed,
       is_won = s.is_won,
       is_lost = s.is_lost,
       updated_at = now()
  from canonical_supplier_pipelines c
  join supplier_stages s on true
 where ps.pipeline_id = c.pipeline_id
   and lower(ps.name) = lower(s.name);
