-- 042_search_aliases_and_reference_data.sql
-- Backfill and normalize search aliases so country lookup behaves the way the UI expects.

update public.countries
set search_aliases = trim(both ' ' from concat_ws(
  ' ',
  coalesce(search_aliases, ''),
  coalesce(lower(name), ''),
  coalesce(lower(iso2_code), ''),
  coalesce(lower(iso3_code), ''),
  coalesce(lower(phone_code), '')
))
where coalesce(search_aliases, '') = ''
   or search_aliases is null;

create index if not exists countries_org_search_aliases_idx
  on public.countries (organization_id, search_aliases);

create index if not exists countries_iso2_idx
  on public.countries (iso2_code)
  where iso2_code is not null;

create index if not exists countries_iso3_idx
  on public.countries (iso3_code)
  where iso3_code is not null;

create index if not exists markets_market_code_idx
  on public.markets (market_code)
  where market_code is not null;
