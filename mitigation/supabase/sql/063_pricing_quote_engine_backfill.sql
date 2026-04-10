-- 063_pricing_quote_engine_backfill.sql
-- Purpose: backfill safe defaults for existing quote rows and organization-level
-- pricing settings after schema reconciliation.

begin;

update public.quotes
set display_currency = coalesce(nullif(display_currency, ''), nullif(currency, ''), 'USD')
where display_currency is null or display_currency = '';

update public.quotes
set pricing_basis = coalesce(pricing_basis, 'fob')
where pricing_basis is null;

update public.quotes
set source_type = 'manual'
where source_type is null or source_type = '';

update public.quotes
set notes_internal = notes
where notes_internal is null
  and notes is not null;

update public.quotes q
set quote_number = public.generate_quote_number(q.organization_id)
where q.quote_number is null or btrim(q.quote_number) = '';

update public.quotes
set valid_until = coalesce(valid_until, (created_at::date + 7))
where valid_until is null;

insert into public.pricing_engine_settings (
  organization_id,
  default_display_currency,
  default_validity_days,
  default_fx_base_currency,
  allow_manual_fx,
  require_approval_for_override,
  created_at,
  updated_at
)
select o.id, 'USD', 7, 'USD', true, false, now(), now()
from public.organizations o
where not exists (
  select 1
  from public.pricing_engine_settings s
  where s.organization_id = o.id
);

commit;
