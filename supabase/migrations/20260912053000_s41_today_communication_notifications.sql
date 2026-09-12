-- Read-only feed: preserve historical notifications while showing only today's
-- calendar occurrences. All functions are security invoker and retain RLS.
create or replace function public.setu_notice_occurrence_start(p_ref text, p_event_id uuid)
returns timestamptz language plpgsql immutable security invoker
set search_path = pg_catalog as $$
begin
  if p_event_id is null or left(p_ref,37) <> p_event_id::text || ':' then return null; end if;
  if substring(p_ref from 38) !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$' then return null; end if;
  return substring(p_ref from 38)::timestamptz;
exception when others then return null;
end;
$$;

create or replace function public.setu_communication_notifications_today(
  p_organization_id uuid, p_device_timezone text default 'UTC', p_limit integer default 50
) returns jsonb language plpgsql stable security invoker
set search_path = pg_catalog, public as $$
declare
  v_user uuid := auth.uid();
  v_timezone text;
  v_day date;
  v_result jsonb;
begin
  if v_user is null or not public.is_org_member(p_organization_id) then
    raise exception 'Active workspace membership required' using errcode = '42501';
  end if;
  select timezone into v_timezone from public.calendar_preferences
    where organization_id=p_organization_id and user_id=v_user;
  if v_timezone is null then
    select timezone into v_timezone from public.calendar_availability
      where organization_id=p_organization_id and user_id=v_user and is_active=true
      order by id limit 1;
  end if;
  v_timezone := coalesce(v_timezone,p_device_timezone,'UTC');
  if not exists (select 1 from pg_timezone_names where name=v_timezone) then v_timezone := 'UTC'; end if;
  v_day := (now() at time zone v_timezone)::date;

  with normalized as (
    select n.*, e.title as event_title, e.status as event_status,
      e.starts_at as current_start, e.recurrence_rule, e.recurrence_series_id,
      case when n.type='calendar_reminder' then
        coalesce(public.setu_notice_occurrence_start(n.entity_ref,n.entity_id),
          case when e.recurrence_rule is null and n.entity_ref=e.id::text then e.starts_at end)
      end as occurrence_start
    from public.notifications n
    left join public.calendar_events e on e.id=n.entity_id and e.organization_id=n.organization_id
    where n.organization_id=p_organization_id and n.user_id=v_user
      and n.archived_at is null and n.type in ('mail_received','calendar_reminder')
  ), eligible as (
    select n.*,
      case when n.type='calendar_reminder' then n.entity_id::text || ':' || n.occurrence_start::text else n.id::text end as occurrence_key
    from normalized n
    where n.type='mail_received' or (
      n.event_status is not null and n.event_status <> 'cancelled'
      and (n.occurrence_start at time zone v_timezone)::date=v_day
      and (n.recurrence_rule is not null or n.current_start=n.occurrence_start)
      and not exists (select 1 from public.calendar_events exception
        where exception.organization_id=p_organization_id
          and exception.recurrence_series_id=n.entity_id
          and exception.recurrence_original_start=n.occurrence_start)
    )
  ), ranked as (
    select n.*,
      row_number() over (partition by occurrence_key order by created_at desc,id desc) as occurrence_rank,
      bool_or(read) over (partition by occurrence_key) as occurrence_read,
      array_agg(id) over (partition by occurrence_key) as related_ids
    from eligible n
  ), unread as (
    select * from ranked where occurrence_rank=1 and not occurrence_read
  ), page as (
    select jsonb_build_object('id',id,'type',type,
      'title',case when type='calendar_reminder' then 'Today: ' || event_title else title end,
      'body',body,'action_url',case when type='calendar_reminder' then '/calendar?eventId=' || entity_id::text || '&occurrenceStart=' || occurrence_start::text else action_url end,
      'created_at',created_at,'occurrence_start',occurrence_start,'related_ids',related_ids) as item,
      created_at,id
    from unread order by created_at desc,id desc limit greatest(1,least(coalesce(p_limit,50),100))
  ) select jsonb_build_object('items',coalesce((select jsonb_agg(item order by created_at desc,id desc) from page),'[]'::jsonb),
      'unreadCount',(select count(*) from unread),'timezone',v_timezone,'day',v_day) into v_result;
  return v_result;
end;
$$;
revoke all on function public.setu_notice_occurrence_start(text,uuid) from public;
grant execute on function public.setu_notice_occurrence_start(text,uuid) to authenticated,service_role;
revoke all on function public.setu_communication_notifications_today(uuid,text,integer) from public;
grant execute on function public.setu_communication_notifications_today(uuid,text,integer) to authenticated;
