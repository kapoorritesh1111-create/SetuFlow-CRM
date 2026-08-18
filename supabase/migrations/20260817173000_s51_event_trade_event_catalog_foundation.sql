-- S51-EVENT-018: canonical event catalog + organization attendance foundation.
-- Additive only. Existing public.trade_events rows remain the org-private attendance records.

create table if not exists public.trade_event_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  city text,
  country text,
  starts_on date,
  ends_on date,
  organizer text,
  venue text,
  website_url text,
  vertical_tags text[] not null default '{}',
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trade_event_catalog_date_order check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create index if not exists trade_event_catalog_normalized_name_idx on public.trade_event_catalog(normalized_name);
create index if not exists trade_event_catalog_dates_idx on public.trade_event_catalog(starts_on, ends_on);

alter table public.trade_events
  add column if not exists canonical_event_id uuid references public.trade_event_catalog(id) on delete set null,
  add column if not exists duplicate_of_event_id uuid references public.trade_events(id) on delete set null,
  add column if not exists goals jsonb not null default '{}'::jsonb,
  add column if not exists readiness_state jsonb not null default '{}'::jsonb,
  add column if not exists spend jsonb not null default '{}'::jsonb;

create index if not exists trade_events_canonical_event_idx on public.trade_events(canonical_event_id);
create index if not exists trade_events_duplicate_of_idx on public.trade_events(duplicate_of_event_id) where duplicate_of_event_id is not null;

alter table public.trade_event_catalog enable row level security;

drop policy if exists trade_event_catalog_authenticated_read on public.trade_event_catalog;
create policy trade_event_catalog_authenticated_read
  on public.trade_event_catalog
  for select
  to authenticated
  using (true);

revoke all on public.trade_event_catalog from anon;
grant select on public.trade_event_catalog to authenticated;

comment on table public.trade_event_catalog is 'Global Setu Flow trade-event identity catalog. Organization-private attendance stays in public.trade_events.';
comment on column public.trade_events.canonical_event_id is 'Optional link from an organization attendance record to the global canonical event identity.';
comment on column public.trade_events.duplicate_of_event_id is 'Optional non-destructive reconciliation pointer for duplicate organization attendance rows.';
