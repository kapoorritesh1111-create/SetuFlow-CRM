-- Phase 1: trade_event_entries table
-- Purpose:
--   Capture raw trade-show booth scans / intake rows before conversion into leads.

create table if not exists public.trade_event_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  trade_event_id uuid not null references public.trade_events(id) on delete cascade,
  captured_company_name text,
  captured_contact_name text,
  captured_job_title text,
  captured_email text,
  captured_phone text,
  captured_country text,
  captured_notes text,
  source_label text,
  source_scan_ref text,
  status text not null default 'new' check (status = any (array['new'::text, 'qualified'::text, 'converted'::text, 'duplicate'::text, 'discarded'::text])),
  duplicate_of_entry_id uuid references public.trade_event_entries(id) on delete set null,
  converted_lead_id uuid references public.leads(id) on delete set null,
  assigned_user_id uuid references public.profiles(id) on delete set null,
  normalized_payload jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  captured_at timestamp with time zone not null default now(),
  qualified_at timestamp with time zone,
  converted_at timestamp with time zone,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists trade_event_entries_event_idx on public.trade_event_entries (trade_event_id, created_at desc);
create index if not exists trade_event_entries_org_status_idx on public.trade_event_entries (organization_id, status, created_at desc);
create index if not exists trade_event_entries_converted_lead_idx on public.trade_event_entries (converted_lead_id);
create unique index if not exists trade_event_entries_event_scan_ref_uidx on public.trade_event_entries (trade_event_id, source_scan_ref) where source_scan_ref is not null;

create or replace function public.set_trade_event_entries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_trade_event_entries_updated_at on public.trade_event_entries;
create trigger trg_trade_event_entries_updated_at
before update on public.trade_event_entries
for each row execute function public.set_trade_event_entries_updated_at();

alter table public.trade_event_entries enable row level security;

create policy trade_event_entries_select_same_org on public.trade_event_entries
for select using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = trade_event_entries.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

create policy trade_event_entries_insert_same_org on public.trade_event_entries
for insert with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = trade_event_entries.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

create policy trade_event_entries_update_same_org on public.trade_event_entries
for update using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = trade_event_entries.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
) with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = trade_event_entries.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

comment on table public.trade_event_entries is 'Phase 1 SSOT table for raw trade-show intake before lead qualification and conversion.';
comment on column public.trade_event_entries.status is 'Lifecycle: new -> qualified -> converted, or duplicate/discarded.';
