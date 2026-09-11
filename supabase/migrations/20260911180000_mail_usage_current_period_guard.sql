-- S41-MAIL-010 hardening: historical or delayed provider events must remain visible in
-- historical rollups without moving the active entitlement period backward.

create or replace function public.sync_mail_entitlement_message_counter(p_organization_id uuid, p_period date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_period date := date_trunc('month', now())::date;
  v_count bigint;
begin
  -- Historical rollups are reporting data only. Only the current calendar month can
  -- drive the compatibility entitlement counter used by live quota/status surfaces.
  if p_period <> v_current_period then
    return;
  end if;

  select coalesce(resend_inbound_messages,0) + coalesce(resend_outbound_messages,0)
    into v_count
  from public.mail_usage_monthly_rollups
  where organization_id = p_organization_id and period_start = v_current_period;

  update public.mail_entitlements
  set current_period_start = v_current_period,
      current_period_messages = coalesce(v_count,0)::integer,
      updated_at = now()
  where organization_id = p_organization_id;
end;
$$;

revoke all on function public.sync_mail_entitlement_message_counter(uuid,date) from public, anon, authenticated;
grant execute on function public.sync_mail_entitlement_message_counter(uuid,date) to service_role;

create or replace function public.guard_mail_entitlement_message_counter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_period date := date_trunc('month', now())::date;
  v_count bigint;
begin
  if new.current_period_messages is distinct from old.current_period_messages then
    -- Compatibility writes are normalized to the live calendar period and the durable
    -- monthly rollup, rather than trusting a read-then-write application counter.
    select coalesce(resend_inbound_messages,0) + coalesce(resend_outbound_messages,0)
      into v_count
    from public.mail_usage_monthly_rollups
    where organization_id = new.organization_id
      and period_start = v_current_period;
    new.current_period_start := v_current_period;
    new.current_period_messages := coalesce(v_count,0)::integer;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_mail_entitlement_message_counter() from public, anon, authenticated;
grant execute on function public.guard_mail_entitlement_message_counter() to service_role;

-- Normalize the compatibility counter to the current month once on rollout.
update public.mail_entitlements e
set current_period_start = date_trunc('month', now())::date,
    current_period_messages = coalesce((
      select r.resend_inbound_messages + r.resend_outbound_messages
      from public.mail_usage_monthly_rollups r
      where r.organization_id = e.organization_id
        and r.period_start = date_trunc('month', now())::date
    ),0)::integer,
    updated_at = now();
