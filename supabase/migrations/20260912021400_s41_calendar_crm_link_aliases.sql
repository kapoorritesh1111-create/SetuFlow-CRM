-- Sprint 41 Batch 3: keep /api/calendar authoritative while allowing the existing
-- composer lead query parameter to carry a permission-scoped CRM identity selected
-- by the Calendar CRM linker. Existing Lead/Mail behavior remains unchanged.

create or replace function public.s41_calendar_resolve_crm_link_alias()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_contact public.contacts%rowtype;
  v_quote record;
  v_order record;
  v_task record;
begin
  if new.entity_type <> 'lead' then return new; end if;

  -- Real leads (including buyer/supplier lead roles) stay as lead links so all
  -- existing Calendar behavior remains compatible.
  if exists(select 1 from public.leads l where l.id = new.entity_id and l.organization_id = new.organization_id) then
    return new;
  end if;

  select * into v_contact from public.contacts c
   where c.id = new.entity_id and c.organization_id = new.organization_id and c.archived_at is null;
  if found then
    new.label := concat('[contact] ', coalesce(nullif(btrim(v_contact.first_name || ' ' || v_contact.last_name), ''), v_contact.company, v_contact.email));
    return new;
  end if;

  select q.id, q.quote_number into v_quote from public.quotes q where q.id = new.entity_id and q.organization_id = new.organization_id;
  if found then new.entity_type := 'quote'; new.label := coalesce('Quote ' || v_quote.quote_number, 'Quote'); return new; end if;

  select o.id, o.order_number into v_order from public.orders o where o.id = new.entity_id and o.organization_id = new.organization_id;
  if found then new.entity_type := 'order'; new.label := coalesce('Order ' || v_order.order_number, 'Order'); return new; end if;

  select t.id, t.task_type, t.payload into v_task from public.scheduled_tasks t where t.id = new.entity_id and t.organization_id = new.organization_id;
  if found then new.entity_type := 'task'; new.label := coalesce(v_task.payload->>'title', v_task.payload->>'label', v_task.task_type, 'Task'); return new; end if;

  raise exception 'CALENDAR_CRM_LINK_NOT_ACCESSIBLE';
end;
$$;

drop trigger if exists calendar_event_links_resolve_crm_alias on public.calendar_event_links;
create trigger calendar_event_links_resolve_crm_alias
before insert or update on public.calendar_event_links
for each row execute function public.s41_calendar_resolve_crm_link_alias();

grant execute on function public.s41_calendar_resolve_crm_link_alias() to authenticated;
revoke all on function public.s41_calendar_resolve_crm_link_alias() from anon;
