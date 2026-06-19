-- Sprint 31 / Trade Show Trial default reference data
-- Ensures every trade show trial organization gets baseline Markets, Countries, and Next Steps.

with source_org as (
  select '3327b9a7-aadb-44b0-9793-30c4045d3c92'::uuid as id
), trial_orgs as (
  select distinct organization_id
  from public.organization_trial_capabilities
  where trial_mode = 'trade_show_trial'
  union
  select distinct organization_id
  from public.trade_show_trial_workspaces
  where organization_id is not null
), market_seed as (
  insert into public.markets (organization_id, name, sort_order, is_active)
  select trial_orgs.organization_id,
         source_markets.name,
         source_markets.sort_order,
         coalesce(source_markets.is_active, true)
  from public.markets source_markets
  cross join source_org
  join trial_orgs on true
  where source_markets.organization_id = source_org.id
  on conflict (organization_id, name) do update
    set sort_order = excluded.sort_order,
        is_active = excluded.is_active,
        updated_at = now()
  returning id, organization_id, name
), all_trial_markets as (
  select id, organization_id, name from market_seed
  union
  select id, organization_id, name
  from public.markets
  where organization_id in (select organization_id from trial_orgs)
), country_seed as (
  insert into public.countries (
    organization_id,
    market_id,
    name,
    iso2_code,
    iso3_code,
    phone_code,
    sort_order,
    is_active,
    search_aliases,
    default_port_of_loading
  )
  select trial_orgs.organization_id,
         trial_markets.id,
         source_countries.name,
         source_countries.iso2_code,
         source_countries.iso3_code,
         source_countries.phone_code,
         source_countries.sort_order,
         coalesce(source_countries.is_active, true),
         source_countries.search_aliases,
         source_countries.default_port_of_loading
  from public.countries source_countries
  join public.markets source_markets on source_markets.id = source_countries.market_id
  cross join source_org
  join trial_orgs on true
  join all_trial_markets trial_markets
    on trial_markets.organization_id = trial_orgs.organization_id
   and trial_markets.name = source_markets.name
  where source_countries.organization_id = source_org.id
  on conflict (organization_id, name) do update
    set market_id = excluded.market_id,
        iso2_code = excluded.iso2_code,
        iso3_code = excluded.iso3_code,
        phone_code = excluded.phone_code,
        sort_order = excluded.sort_order,
        is_active = excluded.is_active,
        search_aliases = excluded.search_aliases,
        default_port_of_loading = excluded.default_port_of_loading,
        updated_at = now()
  returning id
), next_step_seed as (
  insert into public.next_steps (organization_id, name, sort_order, is_active)
  select organization_id, name, sort_order, true
  from trial_orgs
  cross join (values
    ('Send Introduction'::text, 10),
    ('Follow up after show'::text, 20),
    ('Share catalog'::text, 30),
    ('Schedule meeting'::text, 40)
  ) as defaults(name, sort_order)
  on conflict (organization_id, name) do update
    set sort_order = excluded.sort_order,
        is_active = excluded.is_active,
        updated_at = now()
  returning id
)
select
  (select count(*) from market_seed) as markets_seeded,
  (select count(*) from country_seed) as countries_seeded,
  (select count(*) from next_step_seed) as next_steps_seeded;
