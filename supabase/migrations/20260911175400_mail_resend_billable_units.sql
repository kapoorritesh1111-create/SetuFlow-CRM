-- S41-MAIL-010: Resend bills both inbound and outbound against quota, and an outbound
-- email with multiple To/Cc/Bcc recipients consumes one email unit per recipient.
-- Make the durable ledger mirror the provider's documented quota semantics.

update public.mail_usage_events e
set quantity = greatest(
  1,
  coalesce(cardinality(m.to_addresses), 0)
  + coalesce(cardinality(m.cc_addresses), 0)
  + coalesce(cardinality(m.bcc_addresses), 0)
)
from public.mail_messages m
where e.provider = 'resend'
  and e.metric = 'resend_outbound_message'
  and e.provider_reference = 'mail_message:' || m.id::text;

create or replace function public.capture_mail_message_usage_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_metric text;
  v_when timestamptz;
  v_quantity bigint := 1;
begin
  if new.direction = 'inbound' and new.status = 'received' and new.provider_message_id is not null then
    v_metric := 'resend_inbound_message';
    v_when := coalesce(new.received_at, new.created_at, now());
    v_quantity := 1;
  elsif new.direction = 'outbound' and new.provider_message_id is not null and new.status not in ('draft','failed') then
    v_metric := 'resend_outbound_message';
    v_when := coalesce(new.sent_at, new.created_at, now());
    v_quantity := greatest(
      1,
      coalesce(cardinality(new.to_addresses), 0)
      + coalesce(cardinality(new.cc_addresses), 0)
      + coalesce(cardinality(new.bcc_addresses), 0)
    );
  else
    return new;
  end if;

  insert into public.mail_usage_events
    (organization_id, mailbox_id, provider, metric, quantity, provider_reference, metadata, occurred_at)
  values
    (new.organization_id, new.mailbox_id, 'resend', v_metric, v_quantity, 'mail_message:' || new.id::text,
     jsonb_build_object('message_status', new.status, 'billable_units', v_quantity), v_when)
  on conflict (provider, metric, provider_reference) where provider_reference is not null
  do update set
    quantity = excluded.quantity,
    metadata = excluded.metadata,
    occurred_at = excluded.occurred_at;
  return new;
end;
$$;

revoke all on function public.capture_mail_message_usage_event() from public, anon, authenticated;
grant execute on function public.capture_mail_message_usage_event() to service_role;

-- Rebuild the new rollup table after correcting historical recipient quantities.
-- This table is derived data introduced by S41-MAIL-010, so a rebuild is safe.
delete from public.mail_usage_monthly_rollups;

insert into public.mail_usage_monthly_rollups
  (organization_id, period_start, resend_inbound_messages, resend_outbound_messages, cloudmersive_scans, updated_at)
select
  organization_id,
  date_trunc('month', occurred_at)::date,
  coalesce(sum(quantity) filter (where metric = 'resend_inbound_message'),0),
  coalesce(sum(quantity) filter (where metric = 'resend_outbound_message'),0),
  coalesce(sum(quantity) filter (where metric = 'cloudmersive_scan'),0),
  now()
from public.mail_usage_events
group by organization_id, date_trunc('month', occurred_at)::date;

update public.mail_entitlements e
set current_period_messages = coalesce((
  select r.resend_inbound_messages + r.resend_outbound_messages
  from public.mail_usage_monthly_rollups r
  where r.organization_id = e.organization_id
    and r.period_start = e.current_period_start
),0)::integer,
updated_at = now();
