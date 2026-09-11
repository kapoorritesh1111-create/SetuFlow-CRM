-- Batch 4: serialize public calendar bookings per organizer so two visitors cannot reserve the same time concurrently.
create or replace function public.calendar_book_slot_if_available(
  p_organization_id uuid,
  p_user_id uuid,
  p_title text,
  p_description text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_timezone text,
  p_buffer_minutes integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_buffer interval := make_interval(mins => greatest(coalesce(p_buffer_minutes, 0), 0));
begin
  if p_organization_id is null or p_user_id is null then
    raise exception 'organization and user are required';
  end if;
  if p_ends_at <= p_starts_at then
    raise exception 'end time must be after start time';
  end if;

  -- Serialize booking attempts for one organizer inside this transaction.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  if exists (
    select 1
    from public.calendar_events e
    where e.organization_id = p_organization_id
      and e.owner_user_id = p_user_id
      and e.status <> 'cancelled'
      and coalesce(e.show_as, 'busy') <> 'free'
      and e.starts_at < (p_ends_at + v_buffer)
      and e.ends_at > (p_starts_at - v_buffer)
  ) then
    return null;
  end if;

  insert into public.calendar_events (
    organization_id,
    owner_user_id,
    created_by,
    title,
    description,
    starts_at,
    ends_at,
    timezone,
    status,
    visibility,
    show_as,
    meeting_provider,
    meeting_metadata
  ) values (
    p_organization_id,
    p_user_id,
    p_user_id,
    left(coalesce(nullif(trim(p_title), ''), 'Scheduled meeting'), 180),
    nullif(left(coalesce(p_description, ''), 4000), ''),
    p_starts_at,
    p_ends_at,
    coalesce(nullif(trim(p_timezone), ''), 'UTC'),
    'confirmed',
    'organization',
    'busy',
    'none',
    jsonb_build_object('source', 'public_booking', 'reserved_at', now())
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

revoke all on function public.calendar_book_slot_if_available(uuid, uuid, text, text, timestamptz, timestamptz, text, integer) from public, anon, authenticated;
grant execute on function public.calendar_book_slot_if_available(uuid, uuid, text, text, timestamptz, timestamptz, text, integer) to service_role;
