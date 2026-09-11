-- S41-MAIL-010 follow-up: align live provider plans and make the durable ledger
-- authoritative for the legacy entitlement counters used elsewhere in Mail.

update public.mail_provider_cost_settings
set active_plan_key = case provider
  when 'resend' then 'pro'
  when 'cloudmersive' then 'basic'
  else active_plan_key
end,
updated_at = now()
where provider in ('resend','cloudmersive');

create or replace function public.sync_mail_entitlement_message_counter(p_organization_id uuid, p_period date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count bigint;
begin
  select coalesce(resend_inbound_messages,0) + coalesce(resend_outbound_messages,0)
    into v_count
  from public.mail_usage_monthly_rollups
  where organization_id = p_organization_id and period_start = p_period;

  update public.mail_entitlements
  set current_period_start = p_period,
      current_period_messages = coalesce(v_count,0)::integer,
      updated_at = now()
  where organization_id = p_organization_id;
end;
$$;

revoke all on function public.sync_mail_entitlement_message_counter(uuid,date) from public, anon, authenticated;
grant execute on function public.sync_mail_entitlement_message_counter(uuid,date) to service_role;

create or replace function public.rollup_mail_usage_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period date := date_trunc('month', new.occurred_at)::date;
begin
  insert into public.mail_usage_monthly_rollups
    (organization_id, period_start, resend_inbound_messages, resend_outbound_messages, cloudmersive_scans, updated_at)
  values
    (new.organization_id, v_period,
     case when new.metric = 'resend_inbound_message' then new.quantity else 0 end,
     case when new.metric = 'resend_outbound_message' then new.quantity else 0 end,
     case when new.metric = 'cloudmersive_scan' then new.quantity else 0 end,
     now())
  on conflict (organization_id, period_start) do update set
    resend_inbound_messages = public.mail_usage_monthly_rollups.resend_inbound_messages + excluded.resend_inbound_messages,
    resend_outbound_messages = public.mail_usage_monthly_rollups.resend_outbound_messages + excluded.resend_outbound_messages,
    cloudmersive_scans = public.mail_usage_monthly_rollups.cloudmersive_scans + excluded.cloudmersive_scans,
    updated_at = now();

  if new.metric in ('resend_inbound_message','resend_outbound_message') then
    perform public.sync_mail_entitlement_message_counter(new.organization_id, v_period);
  end if;
  return new;
end;
$$;

revoke all on function public.rollup_mail_usage_event() from public, anon, authenticated;
grant execute on function public.rollup_mail_usage_event() to service_role;

-- Existing webhook code still performs a compatibility increment after inbound persistence.
-- Normalize that write back to the ledger total so it cannot double-count or race.
create or replace function public.guard_mail_entitlement_message_counter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count bigint;
begin
  if new.current_period_messages is distinct from old.current_period_messages then
    select coalesce(resend_inbound_messages,0) + coalesce(resend_outbound_messages,0)
      into v_count
    from public.mail_usage_monthly_rollups
    where organization_id = new.organization_id
      and period_start = new.current_period_start;
    new.current_period_messages := coalesce(v_count,0)::integer;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_mail_entitlement_message_counter() from public, anon, authenticated;
grant execute on function public.guard_mail_entitlement_message_counter() to service_role;

drop trigger if exists mail_entitlements_guard_message_counter on public.mail_entitlements;
create trigger mail_entitlements_guard_message_counter
before update of current_period_messages on public.mail_entitlements
for each row execute function public.guard_mail_entitlement_message_counter();

-- Final reconciliation after provider-plan and trigger installation.
update public.mail_entitlements e
set current_period_messages = coalesce((
  select r.resend_inbound_messages + r.resend_outbound_messages
  from public.mail_usage_monthly_rollups r
  where r.organization_id = e.organization_id
    and r.period_start = e.current_period_start
),0)::integer,
updated_at = now();
