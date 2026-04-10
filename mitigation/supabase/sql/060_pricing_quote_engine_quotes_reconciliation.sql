-- 060_pricing_quote_engine_quotes_reconciliation.sql
-- Purpose: reconcile the parent quotes table with the pricing / quote engine model
-- using the current schema as baseline.

begin;

alter table public.quotes
  add column if not exists quote_number text,
  add column if not exists version_no integer not null default 0,
  add column if not exists pricing_basis text,
  add column if not exists display_currency text,
  add column if not exists destination_port text,
  add column if not exists valid_until date,
  add column if not exists market_id uuid,
  add column if not exists country_id uuid,
  add column if not exists freight_profile_id uuid,
  add column if not exists current_version_id uuid,
  add column if not exists source_type text not null default 'manual',
  add column if not exists approval_required boolean not null default false,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid,
  add column if not exists accepted_version_id uuid,
  add column if not exists notes_internal text,
  add column if not exists notes_customer text;

-- Drop legacy quotes.status check constraints so we can widen the parent-thread lifecycle.
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'quotes'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table public.quotes drop constraint if exists %I', r.conname);
  end loop;
end $$;

alter table public.quotes
  add constraint quotes_status_check
  check (
    status = any (
      array[
        'draft'::text,
        'in_review'::text,
        'sent'::text,
        'negotiating'::text,
        'accepted'::text,
        'rejected'::text,
        'expired'::text,
        'cancelled'::text
      ]
    )
  );

-- Reconcile pricing_basis and display_currency checks to known names.
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'quotes'
      and c.contype = 'c'
      and (
        pg_get_constraintdef(c.oid) ilike '%pricing_basis%'
        or pg_get_constraintdef(c.oid) ilike '%display_currency%'
      )
  loop
    execute format('alter table public.quotes drop constraint if exists %I', r.conname);
  end loop;
end $$;

alter table public.quotes
  add constraint quotes_pricing_basis_check
  check (
    pricing_basis is null
    or pricing_basis = any (
      array['ex_factory'::text, 'fob'::text, 'cif'::text, 'bulk_chips'::text]
    )
  );

alter table public.quotes
  add constraint quotes_display_currency_check
  check (
    display_currency is null
    or display_currency = any (
      array['USD'::text, 'INR'::text, 'EUR'::text, 'GBP'::text, 'AED'::text]
    )
  );

-- source_type is intentionally modest in v1 to avoid blocking existing flows.
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'quotes'
      and c.conname = 'quotes_source_type_check'
  ) then
    alter table public.quotes
      add constraint quotes_source_type_check
      check (
        source_type = any (
          array['manual'::text, 'rfq'::text, 'lead'::text, 'imported'::text, 'api'::text]
        )
      );
  end if;
end $$;

-- Ensure supporting foreign keys exist when running against partially reconciled schemas.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'quotes_market_id_fkey'
  ) then
    alter table public.quotes
      add constraint quotes_market_id_fkey
      foreign key (market_id) references public.markets(id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'quotes_country_id_fkey'
  ) then
    alter table public.quotes
      add constraint quotes_country_id_fkey
      foreign key (country_id) references public.countries(id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'quotes_freight_profile_id_fkey'
  ) then
    alter table public.quotes
      add constraint quotes_freight_profile_id_fkey
      foreign key (freight_profile_id) references public.freight_profiles(id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'quotes_current_version_id_fkey'
  ) then
    alter table public.quotes
      add constraint quotes_current_version_id_fkey
      foreign key (current_version_id) references public.quote_versions(id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'quotes_approved_by_fkey'
  ) then
    alter table public.quotes
      add constraint quotes_approved_by_fkey
      foreign key (approved_by) references public.profiles(id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'quotes_accepted_version_id_fkey'
  ) then
    alter table public.quotes
      add constraint quotes_accepted_version_id_fkey
      foreign key (accepted_version_id) references public.quote_versions(id);
  end if;
end $$;

commit;
