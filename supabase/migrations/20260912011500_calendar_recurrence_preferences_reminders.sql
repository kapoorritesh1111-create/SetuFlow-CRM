-- Calendar Batch 2: recurrence overrides, canonical user preferences, and recurring reminder delivery ledger.

alter table public.calendar_events
  add column if not exists recurrence_series_id uuid references public.calendar_events(id) on delete cascade,
  add column if not exists recurrence_original_start timestamptz;

create unique index if not exists calendar_events_series_occurrence_unique
  on public.calendar_events(recurrence_series_id, recurrence_original_start)
  where recurrence_series_id is not null and recurrence_original_start is not null;

create index if not exists calendar_events_series_lookup_idx
  on public.calendar_events(organization_id, recurrence_series_id, recurrence_original_start);

alter table public.calendar_events drop constraint if exists calendar_events_recurrence_override_shape_check;
alter table public.calendar_events add constraint calendar_events_recurrence_override_shape_check
  check (
    (recurrence_series_id is null and recurrence_original_start is null)
    or
    (recurrence_series_id is not null and recurrence_original_start is not null)
  );

create or replace function public.calendar_inherit_series_recurrence_rule()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.recurrence_series_id is not null then
    select recurrence_rule
      into new.recurrence_rule
      from public.calendar_events
      where id = new.recurrence_series_id
        and organization_id = new.organization_id;
  end if;
  return new;
end;
$$;

drop trigger if exists calendar_inherit_series_recurrence_rule_trigger on public.calendar_events;
create trigger calendar_inherit_series_recurrence_rule_trigger
before insert or update of recurrence_series_id, recurrence_rule
on public.calendar_events
for each row
execute function public.calendar_inherit_series_recurrence_rule();

create or replace function public.calendar_sync_series_recurrence_rule()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.recurrence_series_id is null and new.recurrence_rule is distinct from old.recurrence_rule then
    update public.calendar_events
       set recurrence_rule = new.recurrence_rule,
           updated_at = now()
     where organization_id = new.organization_id
       and recurrence_series_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists calendar_sync_series_recurrence_rule_trigger on public.calendar_events;
create trigger calendar_sync_series_recurrence_rule_trigger
after update of recurrence_rule
on public.calendar_events
for each row
execute function public.calendar_sync_series_recurrence_rule();

create table if not exists public.calendar_preferences (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  timezone text not null default 'UTC',
  default_reminder_minutes integer not null default 15 check (default_reminder_minutes between 0 and 10080),
  default_reminder_channels text[] not null default array['in_app']::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id),
  constraint calendar_preferences_channels_check check (
    default_reminder_channels <@ array['in_app','email']::text[]
    and cardinality(default_reminder_channels) between 1 and 2
  )
);

alter table public.calendar_preferences enable row level security;
revoke all on table public.calendar_preferences from anon;
grant select, insert, update, delete on table public.calendar_preferences to authenticated;
grant select, insert, update, delete on table public.calendar_preferences to service_role;

drop policy if exists calendar_preferences_owner_all on public.calendar_preferences;
create policy calendar_preferences_owner_all
  on public.calendar_preferences
  for all
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.organization_members om
      where om.organization_id = calendar_preferences.organization_id
        and om.user_id = (select auth.uid())
        and om.is_active = true
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.organization_members om
      where om.organization_id = calendar_preferences.organization_id
        and om.user_id = (select auth.uid())
        and om.is_active = true
    )
  );

create table if not exists public.calendar_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reminder_id uuid not null references public.calendar_reminders(id) on delete cascade,
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  occurrence_start timestamptz not null,
  channel text not null check (channel in ('in_app','email')),
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(reminder_id, occurrence_start, channel)
);

create index if not exists calendar_reminder_deliveries_event_idx
  on public.calendar_reminder_deliveries(organization_id, event_id, occurrence_start);

alter table public.calendar_reminder_deliveries enable row level security;
revoke all on table public.calendar_reminder_deliveries from anon, authenticated;
grant select, insert, update, delete on table public.calendar_reminder_deliveries to service_role;
