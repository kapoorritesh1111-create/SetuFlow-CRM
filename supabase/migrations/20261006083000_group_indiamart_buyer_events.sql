-- Group multiple IndiaMART enquiry/call events from the same buyer into one active inbound card.
-- Raw IndiaMART events remain in lead_intake_staging for audit/history.

create or replace function public.group_recent_indiamart_buyer_events(
  p_organization_id uuid,
  p_session_hours integer default 24
)
returns jsonb
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  v_hidden integer := 0;
  v_canonical integer := 0;
begin
  with ordered as (
    select
      s.id,
      right(regexp_replace(coalesce(s.full_phone_number,s.phone_number,''),'[^0-9]','','g'),10) as phone_key,
      coalesce(s.source_created_at,s.updated_at) as event_at,
      s.intake_status,
      s.qualified_lead_id,
      s.sales_queue_suppressed,
      lag(coalesce(s.source_created_at,s.updated_at)) over (
        partition by right(regexp_replace(coalesce(s.full_phone_number,s.phone_number,''),'[^0-9]','','g'),10)
        order by coalesce(s.source_created_at,s.updated_at), s.id
      ) as prev_at
    from public.lead_intake_staging s
    where s.organization_id = p_organization_id
      and s.source_provider = 'indiamart'
      and length(regexp_replace(coalesce(s.full_phone_number,s.phone_number,''),'[^0-9]','','g')) >= 10
      and coalesce(s.source_created_at,s.updated_at) >= now() - interval '14 days'
  ),
  sessionized as (
    select *,
      sum(case
        when prev_at is null or event_at - prev_at > make_interval(hours => greatest(1, least(coalesce(p_session_hours,24),72)))
        then 1 else 0 end
      ) over (partition by phone_key order by event_at,id) as session_no
    from ordered
  ),
  stats as (
    select
      phone_key,
      session_no,
      count(*) as row_count,
      bool_or(intake_status in ('qualified','duplicate','existing_customer','not_relevant','ignored')) as has_terminal,
      max(event_at) as latest_event_at
    from sessionized
    group by phone_key,session_no
    having count(*) > 1
  ),
  canonical as (
    select distinct on (s.phone_key,s.session_no)
      s.phone_key,s.session_no,s.id as canonical_id
    from sessionized s
    join stats st using (phone_key,session_no)
    where st.has_terminal = false
      and s.sales_queue_suppressed = false
      and s.intake_status not in ('qualified','duplicate','existing_customer','not_relevant','ignored')
    order by s.phone_key,s.session_no,s.event_at,s.id
  ),
  hidden as (
    update public.lead_intake_staging x
    set
      sales_queue_suppressed = true,
      sales_queue_suppressed_reason = case
        when st.has_terminal then 'indiamart_same_buyer_session_converted'
        else 'indiamart_same_buyer_event_grouped'
      end,
      updated_at = now()
    from sessionized s
    join stats st using (phone_key,session_no)
    left join canonical c using (phone_key,session_no)
    where x.id = s.id
      and x.sales_queue_suppressed = false
      and x.intake_status not in ('qualified','duplicate','existing_customer','not_relevant','ignored')
      and (st.has_terminal or x.id <> c.canonical_id)
    returning x.id
  ),
  refreshed as (
    update public.lead_intake_staging x
    set
      last_inbound_at = greatest(coalesce(x.last_inbound_at,'epoch'::timestamptz),st.latest_event_at),
      source_modified_at = greatest(coalesce(x.source_modified_at,'epoch'::timestamptz),st.latest_event_at),
      updated_at = now()
    from canonical c
    join stats st using (phone_key,session_no)
    where x.id = c.canonical_id
    returning x.id
  )
  select (select count(*) from hidden),(select count(*) from refreshed)
  into v_hidden,v_canonical;

  return jsonb_build_object('hidden',v_hidden,'canonicalUpdated',v_canonical);
end;
$function$;

revoke all on function public.group_recent_indiamart_buyer_events(uuid, integer) from public, anon, authenticated;
grant execute on function public.group_recent_indiamart_buyer_events(uuid, integer) to service_role;
