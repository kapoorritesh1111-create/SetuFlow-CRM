-- Phase 0 manual Supabase cleanup
-- Run this in the Supabase SQL editor before marking Phase 0 complete.
-- Purpose:
--   1) rename any stored pricing-basis value `cfi` -> `cif`
--   2) replace check constraints that still allow `cfi`
--   3) keep the repo and database terminology aligned

begin;

update public.quote_version_line_items
set basis_applied = 'cif'
where basis_applied = 'cfi';

update public.quote_versions
set pricing_basis = 'cif'
where pricing_basis = 'cfi';

update public.quotes
set pricing_basis = 'cif'
where pricing_basis = 'cfi';

alter table public.quote_version_line_items
  drop constraint if exists quote_version_line_items_basis_applied_check;
alter table public.quote_version_line_items
  add constraint quote_version_line_items_basis_applied_check
  check (basis_applied = any (array['ex_factory'::text, 'fob'::text, 'cif'::text, 'bulk_chips'::text]));

alter table public.quote_versions
  drop constraint if exists quote_versions_pricing_basis_check;
alter table public.quote_versions
  add constraint quote_versions_pricing_basis_check
  check (pricing_basis = any (array['ex_factory'::text, 'fob'::text, 'cif'::text, 'bulk_chips'::text]));

alter table public.quotes
  drop constraint if exists quotes_pricing_basis_check;
alter table public.quotes
  add constraint quotes_pricing_basis_check
  check (pricing_basis is null or pricing_basis = any (array['ex_factory'::text, 'fob'::text, 'cif'::text, 'bulk_chips'::text]));

commit;
