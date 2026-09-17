alter table public.integration_events
  drop constraint if exists integration_events_status_check;

alter table public.integration_events
  add constraint integration_events_status_check
  check (status = any (array['received'::text, 'processed'::text, 'error'::text, 'success'::text, 'failed'::text]));
