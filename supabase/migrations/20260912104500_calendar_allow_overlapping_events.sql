-- Calendar clients must support legitimate overlapping meetings.
-- Availability/conflict warnings belong in the application layer; they must not block RSVP/import.
alter table public.calendar_events
  drop constraint if exists calendar_events_no_overlap;

comment on table public.calendar_events is
  'Calendar events may overlap. Clients may warn about conflicts, but valid meetings and external invitations are not rejected solely because times overlap.';
