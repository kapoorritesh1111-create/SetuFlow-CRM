-- Applied to production through Supabase migration tooling on 2026-09-10.
-- Canonical Setu Communications Calendar MVP schema.
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_user_id uuid not null, created_by uuid not null, title text not null, description text, location text,
  starts_at timestamptz not null, ends_at timestamptz not null, timezone text not null default 'UTC', is_all_day boolean not null default false,
  status text not null default 'confirmed', visibility text not null default 'organization', meeting_provider text not null default 'none',
  meeting_url text, meeting_external_id text, meeting_host_url text, meeting_password text, meeting_metadata jsonb not null default '{}'::jsonb,
  recurrence_rule text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check (ends_at > starts_at)
);
create table if not exists public.calendar_attendees (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.calendar_events(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade, email text not null, name text,
  attendee_type text not null default 'required', rsvp_status text not null default 'needs_action', response_token uuid not null default gen_random_uuid(), responded_at timestamptz,
  created_at timestamptz not null default now(), unique(event_id,email)
);
create table if not exists public.calendar_reminders (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.calendar_events(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade, channel text not null default 'in_app', minutes_before integer not null default 15,
  sent_at timestamptz, created_at timestamptz not null default now(), unique(event_id,channel,minutes_before)
);
create table if not exists public.calendar_event_links (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.calendar_events(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade, entity_type text not null, entity_id uuid not null, label text,
  created_at timestamptz not null default now(), unique(event_id,entity_type,entity_id)
);
create table if not exists public.calendar_availability (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, user_id uuid not null,
  weekday smallint not null, start_time time not null, end_time time not null, timezone text not null default 'UTC', is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check (weekday between 0 and 6), check (end_time > start_time)
);
create table if not exists public.calendar_booking_pages (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, user_id uuid not null,
  slug text not null unique, title text not null default 'Schedule a meeting', description text, duration_minutes integer not null default 30,
  buffer_minutes integer not null default 15, minimum_notice_minutes integer not null default 240, booking_window_days integer not null default 30,
  meeting_provider text not null default 'zoom', custom_meeting_url text, is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.meeting_connections (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, user_id uuid not null,
  provider text not null, provider_account_id text, provider_user_id text, account_email text, access_token text, refresh_token text, token_expires_at timestamptz,
  scopes text, status text not null default 'active', metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,user_id,provider)
);
create index if not exists calendar_events_org_start_idx on public.calendar_events(organization_id,starts_at);
create index if not exists calendar_events_owner_start_idx on public.calendar_events(owner_user_id,starts_at);
alter table public.calendar_events enable row level security; alter table public.calendar_attendees enable row level security; alter table public.calendar_reminders enable row level security;
alter table public.calendar_event_links enable row level security; alter table public.calendar_availability enable row level security; alter table public.calendar_booking_pages enable row level security; alter table public.meeting_connections enable row level security;
-- Policies are intentionally membership-scoped; provider credentials are service-role only.
revoke all on public.meeting_connections from anon, authenticated;
