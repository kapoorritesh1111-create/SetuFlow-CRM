-- Keep the original recurring-series date anchor stable when an organizer opens a later
-- occurrence and applies edits to the entire series. Time-of-day, duration, recurrence
-- pattern, attendees and other fields may still change. This prevents a later occurrence
-- from becoming a new DTSTART and silently erasing earlier virtual occurrences.

create or replace function public.calendar_preserve_series_anchor_date()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  old_tz text := coalesce(nullif(old.timezone, ''), 'UTC');
  new_tz text := coalesce(nullif(new.timezone, ''), old_tz, 'UTC');
  old_local timestamp;
  new_local timestamp;
  requested_duration interval;
begin
  if old.recurrence_series_id is null
     and old.recurrence_rule is not null
     and new.recurrence_series_id is null
     and new.recurrence_rule is not null then
    old_local := old.starts_at at time zone old_tz;
    new_local := new.starts_at at time zone new_tz;

    if old_local::date is distinct from new_local::date then
      requested_duration := new.ends_at - new.starts_at;
      new.starts_at := ((old_local::date + new_local::time) at time zone new_tz);
      new.ends_at := new.starts_at + requested_duration;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists calendar_preserve_series_anchor_date_trigger on public.calendar_events;
create trigger calendar_preserve_series_anchor_date_trigger
before update of starts_at, ends_at, timezone, recurrence_rule
on public.calendar_events
for each row
execute function public.calendar_preserve_series_anchor_date();
