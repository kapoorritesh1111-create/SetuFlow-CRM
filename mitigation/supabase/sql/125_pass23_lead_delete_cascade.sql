-- Pass 23: Optional schema hardening for Lead Delete
-- Checked against live Supabase before authoring: every lead child FK already cascades
-- except scheduled_tasks.lead_id. The app action deletes scheduled_tasks first, so this
-- migration is optional, but it makes future direct lead deletes safer.

alter table if exists public.scheduled_tasks
  drop constraint if exists scheduled_tasks_lead_id_fkey;

alter table if exists public.scheduled_tasks
  add constraint scheduled_tasks_lead_id_fkey
  foreign key (lead_id)
  references public.leads(id)
  on delete cascade;
