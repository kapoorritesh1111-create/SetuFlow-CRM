begin;

alter table public.calendar_events
  add column if not exists ics_sequence integer not null default 0,
  add column if not exists cancelled_at timestamptz;

alter table public.calendar_attendees
  add column if not exists last_invited_at timestamptz,
  add column if not exists last_invited_sequence integer not null default -1,
  add column if not exists last_invitation_method text,
  add column if not exists responded_via text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'calendar_events_ics_sequence_check'
      and conrelid = 'public.calendar_events'::regclass
  ) then
    alter table public.calendar_events
      add constraint calendar_events_ics_sequence_check check (ics_sequence >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'calendar_attendees_last_invited_sequence_check'
      and conrelid = 'public.calendar_attendees'::regclass
  ) then
    alter table public.calendar_attendees
      add constraint calendar_attendees_last_invited_sequence_check check (last_invited_sequence >= -1);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'calendar_attendees_last_invitation_method_check'
      and conrelid = 'public.calendar_attendees'::regclass
  ) then
    alter table public.calendar_attendees
      add constraint calendar_attendees_last_invitation_method_check
      check (last_invitation_method is null or last_invitation_method in ('REQUEST','CANCEL'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'calendar_attendees_responded_via_check'
      and conrelid = 'public.calendar_attendees'::regclass
  ) then
    alter table public.calendar_attendees
      add constraint calendar_attendees_responded_via_check
      check (responded_via is null or responded_via in ('setu_link','calendar_reply','organizer'));
  end if;
end $$;

create index if not exists calendar_attendees_response_token_idx
  on public.calendar_attendees(response_token);

comment on column public.calendar_events.ics_sequence is
  'Stable iCalendar sequence used for REQUEST/CANCEL updates across Outlook, Google Calendar and Apple Calendar.';
comment on column public.calendar_attendees.last_invited_sequence is
  'Last iCalendar sequence successfully sent to this attendee; supports idempotent retries.';
comment on column public.calendar_attendees.responded_via is
  'How the attendee response was captured without storing message content.';

commit;
