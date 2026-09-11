-- Applied to production through Supabase migration tooling on 2026-09-11.
-- Adds Outlook/Google-style free/busy state without changing existing event semantics.
alter table public.calendar_events
  add column if not exists show_as text not null default 'busy'
  check (show_as in ('busy','free','tentative','out_of_office','working_elsewhere'));

comment on column public.calendar_events.show_as is 'Calendar availability status used by Setu Calendar scheduling and free/busy display.';
