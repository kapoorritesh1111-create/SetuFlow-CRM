-- Production hotfix: a previously browsing-only Interakt contact must return to the
-- active sales queue when they re-engage with a meaningful inbound requirement.
create or replace function public.tg_unsuppress_reengaged_interakt_contact()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_text text;
begin
  if new.direction <> 'inbound' then
    return new;
  end if;

  v_text := lower(trim(coalesce(new.message_text, '')));
  if v_text = '' or v_text = 'just browsing' then
    return new;
  end if;

  if length(v_text) >= 12
     or v_text ~ '(catalog|packag|pouch|bag|quote|price|order|need|want|outsource|partner|product|requirement|sample)'
  then
    update public.lead_intake_staging
       set sales_queue_suppressed = false,
           browsing_only = false,
           sales_queue_suppressed_reason = null,
           updated_at = now()
     where id = new.intake_id
       and organization_id = new.organization_id
       and source_provider = 'interakt'
       and sales_queue_suppressed = true;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_unsuppress_reengaged_interakt_contact on public.lead_intake_messages;
create trigger trg_unsuppress_reengaged_interakt_contact
after insert or update of message_text, direction
on public.lead_intake_messages
for each row
execute function public.tg_unsuppress_reengaged_interakt_contact();
