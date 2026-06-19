-- Sprint 31 / Trade Show Trial default pipelines
-- Ensures every trade show trial organization can save Quick Lead records immediately.

with trial_orgs as (
  select distinct organization_id
  from public.organization_trial_capabilities
  where trial_mode = 'trade_show_trial'
  union
  select distinct organization_id
  from public.trade_show_trial_workspaces
  where organization_id is not null
), seeded_pipelines as (
  insert into public.pipelines (organization_id, name, lead_type, is_default)
  select trial_orgs.organization_id, defaults.name, defaults.lead_type, true
  from trial_orgs
  cross join (values
    ('Trade Show Buyer Pipeline'::text, 'buyer'::text),
    ('Trade Show Supplier Pipeline'::text, 'supplier'::text)
  ) as defaults(name, lead_type)
  on conflict (organization_id, name) do update
    set lead_type = excluded.lead_type,
        is_default = true,
        updated_at = now()
  returning id, organization_id, name
), all_trial_pipelines as (
  select id, organization_id, name from seeded_pipelines
  union
  select id, organization_id, name
  from public.pipelines
  where organization_id in (select organization_id from trial_orgs)
    and name in ('Trade Show Buyer Pipeline', 'Trade Show Supplier Pipeline')
), stage_seed as (
  insert into public.pipeline_stages (pipeline_id, name, sort_order, color, is_closed, is_won, is_lost)
  select all_trial_pipelines.id,
         defaults.name,
         defaults.sort_order,
         defaults.color,
         defaults.is_closed,
         defaults.is_won,
         false
  from all_trial_pipelines
  cross join (values
    ('New booth lead'::text, 10, '#2563eb'::text, false, false),
    ('Follow-up scheduled'::text, 20, '#0d9488'::text, false, false),
    ('Qualified after show'::text, 30, '#7c3aed'::text, false, false),
    ('Converted after upgrade'::text, 40, '#16a34a'::text, true, true)
  ) as defaults(name, sort_order, color, is_closed, is_won)
  on conflict (pipeline_id, name) do update
    set sort_order = excluded.sort_order,
        color = excluded.color,
        is_closed = excluded.is_closed,
        is_won = excluded.is_won,
        is_lost = excluded.is_lost,
        updated_at = now()
  returning id
)
select
  (select count(*) from seeded_pipelines) as pipelines_seeded,
  (select count(*) from stage_seed) as stages_seeded;
