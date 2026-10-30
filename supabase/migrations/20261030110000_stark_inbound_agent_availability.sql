-- Stark inbound availability is independent of Supabase sign-in presence.
-- Non-destructive: does not change any existing owner or trigger.
create table if not exists public.stark_inbound_agent_availability (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'off_duty' check (status in ('available','away','off_duty')),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
alter table public.stark_inbound_agent_availability enable row level security;
-- No direct Data API permissions. Updates happen through server-side
-- owner/admin actions and the service-role client only.
revoke all on public.stark_inbound_agent_availability from anon, authenticated;
create index if not exists stark_inbound_available_idx
  on public.stark_inbound_agent_availability(organization_id,status);
