-- Sprint 7E: correct country-to-market mappings for European countries.
-- Applied in Supabase on 2026-05-10.
-- Purpose: fix new-workspace country rows that were copied into the first/fallback market.

with europe_iso2(code) as (
  values
    ('AL'),('AD'),('AT'),('BY'),('BE'),('BA'),('BG'),('HR'),('CY'),('CZ'),('DK'),('EE'),('FI'),('FR'),('DE'),('GR'),('HU'),('IS'),('IE'),('IT'),('XK'),('LV'),('LI'),('LT'),('LU'),('MT'),('MD'),('MC'),('ME'),('NL'),('MK'),('NO'),('PL'),('PT'),('RO'),('RU'),('SM'),('RS'),('SK'),('SI'),('ES'),('SE'),('CH'),('UA'),('GB'),('VA')
), europe_market as (
  select organization_id, id as market_id
  from public.markets
  where lower(name) = 'europe'
), changed_countries as (
  update public.countries c
     set market_id = em.market_id,
         updated_at = now()
    from europe_market em, europe_iso2 ei
   where c.organization_id = em.organization_id
     and upper(coalesce(c.iso2_code, '')) = ei.code
     and c.market_id <> em.market_id
  returning c.organization_id, c.id, c.name
), changed_orgs as (
  update public.organizations o
     set default_market_id = c.market_id,
         updated_at = now()
    from public.countries c
   where o.default_country_id = c.id
     and o.default_market_id is distinct from c.market_id
  returning o.id
)
select
  (select count(*) from changed_countries) as countries_fixed,
  (select count(*) from changed_orgs) as organization_defaults_fixed;
