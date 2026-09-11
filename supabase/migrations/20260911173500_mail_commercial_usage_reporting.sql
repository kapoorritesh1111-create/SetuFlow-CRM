-- S41-MAIL-010: durable Setu Mail commercial usage and provider-cost reporting.
-- Mail usage is captured only from Setu Mail persistence tables so platform transactional
-- email (invites, notifications, marketing, etc.) is intentionally excluded.

create table if not exists public.mail_usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mailbox_id uuid null references public.mail_mailboxes(id) on delete set null,
  provider text not null check (provider in ('resend','cloudmersive')),
  metric text not null check (metric in ('resend_inbound_message','resend_outbound_message','cloudmersive_scan')),
  quantity bigint not null default 1 check (quantity > 0),
  provider_reference text null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists mail_usage_events_provider_reference_uidx
  on public.mail_usage_events(provider, metric, provider_reference)
  where provider_reference is not null;
create index if not exists mail_usage_events_org_period_idx
  on public.mail_usage_events(organization_id, occurred_at desc);
create index if not exists mail_usage_events_provider_period_idx
  on public.mail_usage_events(provider, metric, occurred_at desc);

alter table public.mail_usage_events enable row level security;
revoke all on table public.mail_usage_events from anon, authenticated;

create table if not exists public.mail_usage_monthly_rollups (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_start date not null,
  resend_inbound_messages bigint not null default 0 check (resend_inbound_messages >= 0),
  resend_outbound_messages bigint not null default 0 check (resend_outbound_messages >= 0),
  cloudmersive_scans bigint not null default 0 check (cloudmersive_scans >= 0),
  updated_at timestamptz not null default now(),
  primary key (organization_id, period_start)
);

create index if not exists mail_usage_monthly_rollups_period_idx
  on public.mail_usage_monthly_rollups(period_start desc, organization_id);

alter table public.mail_usage_monthly_rollups enable row level security;
revoke all on table public.mail_usage_monthly_rollups from anon, authenticated;

create table if not exists public.mail_provider_cost_catalog (
  provider text not null check (provider in ('resend','cloudmersive')),
  plan_key text not null,
  display_name text not null,
  monthly_base_cost_usd numeric(12,4) null check (monthly_base_cost_usd is null or monthly_base_cost_usd >= 0),
  included_quantity bigint null check (included_quantity is null or included_quantity >= 0),
  overage_unit_size bigint null check (overage_unit_size is null or overage_unit_size > 0),
  overage_unit_cost_usd numeric(12,4) null check (overage_unit_cost_usd is null or overage_unit_cost_usd >= 0),
  hard_limit_quantity bigint null check (hard_limit_quantity is null or hard_limit_quantity >= 0),
  max_file_bytes bigint null check (max_file_bytes is null or max_file_bytes > 0),
  source_url text null,
  verified_at date null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (provider, plan_key)
);

alter table public.mail_provider_cost_catalog enable row level security;
revoke all on table public.mail_provider_cost_catalog from anon, authenticated;

create table if not exists public.mail_provider_cost_settings (
  provider text primary key check (provider in ('resend','cloudmersive')),
  active_plan_key text not null,
  updated_by uuid null,
  updated_at timestamptz not null default now(),
  constraint mail_provider_cost_settings_catalog_fk
    foreign key (provider, active_plan_key)
    references public.mail_provider_cost_catalog(provider, plan_key)
    on update cascade on delete restrict
);

alter table public.mail_provider_cost_settings enable row level security;
revoke all on table public.mail_provider_cost_settings from anon, authenticated;

-- Official pricing references verified 2026-09-11. These are an internal estimation catalog;
-- provider invoices remain the accounting source of truth.
insert into public.mail_provider_cost_catalog
  (provider, plan_key, display_name, monthly_base_cost_usd, included_quantity, overage_unit_size, overage_unit_cost_usd, hard_limit_quantity, max_file_bytes, source_url, verified_at, notes)
values
  ('resend','unconfigured','Resend — select account plan',null,null,null,null,null,null,'https://resend.com/pricing','2026-09-11','Select the actual Resend account plan in SMC before treating provider cost as complete.'),
  ('resend','free','Resend Free',0,3000,null,null,3000,null,'https://resend.com/pricing','2026-09-11','3,000 emails/month and 100/day. No paid overage on Free.'),
  ('resend','pro','Resend Pro',20,50000,1000,0.90,null,null,'https://resend.com/pricing','2026-09-11','$20/month includes 50,000 emails; paid-plan overage is $0.90 per additional 1,000-email bucket.'),
  ('resend','scale','Resend Scale',90,100000,1000,0.90,null,null,'https://resend.com/pricing','2026-09-11','$90/month includes 100,000 emails; paid-plan overage is $0.90 per additional 1,000-email bucket.'),
  ('resend','custom','Resend Custom / Enterprise',null,null,null,null,null,null,'https://resend.com/pricing','2026-09-11','Enter contract economics outside this reference catalog before using cost estimates.'),
  ('cloudmersive','free','Cloudmersive Free',0,600,null,null,600,3500000,'https://portal.cloudmersive.com/selectplan','2026-09-11','600 API calls/month; 3.5 MB maximum file size.'),
  ('cloudmersive','basic','Cloudmersive Basic',19.99,10000,null,null,10000,1000000000,'https://portal.cloudmersive.com/selectplan','2026-09-11','10,000 API calls/month; 1 GB maximum file size.'),
  ('cloudmersive','business','Cloudmersive Business',49.99,25000,null,null,25000,1000000000,'https://portal.cloudmersive.com/selectplan','2026-09-11','25,000 API calls/month; 1 GB maximum file size.'),
  ('cloudmersive','business_premier','Cloudmersive Business Premier',99.99,50000,null,null,50000,1000000000,'https://portal.cloudmersive.com/selectplan','2026-09-11','50,000 API calls/month; 1 GB maximum file size.')
on conflict (provider, plan_key) do update set
  display_name = excluded.display_name,
  monthly_base_cost_usd = excluded.monthly_base_cost_usd,
  included_quantity = excluded.included_quantity,
  overage_unit_size = excluded.overage_unit_size,
  overage_unit_cost_usd = excluded.overage_unit_cost_usd,
  hard_limit_quantity = excluded.hard_limit_quantity,
  max_file_bytes = excluded.max_file_bytes,
  source_url = excluded.source_url,
  verified_at = excluded.verified_at,
  notes = excluded.notes,
  updated_at = now();

insert into public.mail_provider_cost_settings(provider, active_plan_key)
values ('resend','unconfigured'), ('cloudmersive','free')
on conflict (provider) do nothing;

-- Backfill existing persisted Setu Mail messages. Failed/draft outbound rows are not
-- provider-billable email sends and are deliberately excluded.
insert into public.mail_usage_events
  (organization_id, mailbox_id, provider, metric, quantity, provider_reference, metadata, occurred_at)
select
  m.organization_id,
  m.mailbox_id,
  'resend',
  case when m.direction = 'inbound' then 'resend_inbound_message' else 'resend_outbound_message' end,
  1,
  'mail_message:' || m.id::text,
  jsonb_build_object('backfill', true),
  coalesce(case when m.direction = 'inbound' then m.received_at else m.sent_at end, m.created_at, now())
from public.mail_messages m
where
  (m.direction = 'inbound' and m.status = 'received' and m.provider_message_id is not null)
  or
  (m.direction = 'outbound' and m.provider_message_id is not null and m.status not in ('draft','failed'))
on conflict do nothing;

-- Backfill existing scan attempts. One historical ledger row may represent multiple attempts;
-- future attempts are captured individually by trigger.
insert into public.mail_usage_events
  (organization_id, mailbox_id, provider, metric, quantity, provider_reference, metadata, occurred_at)
select
  a.organization_id,
  a.mailbox_id,
  coalesce(nullif(a.scan_provider,''), 'cloudmersive'),
  'cloudmersive_scan',
  a.scan_attempts,
  'mail_attachment:' || a.id::text || ':historical',
  jsonb_build_object('backfill', true, 'security_status', a.security_status),
  coalesce(a.scanned_at, a.created_at, now())
from public.mail_attachments a
where coalesce(a.scan_attempts,0) > 0
on conflict do nothing;

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
group by organization_id, date_trunc('month', occurred_at)::date
on conflict (organization_id, period_start) do update set
  resend_inbound_messages = excluded.resend_inbound_messages,
  resend_outbound_messages = excluded.resend_outbound_messages,
  cloudmersive_scans = excluded.cloudmersive_scans,
  updated_at = now();

-- Reconcile the existing quota counter once from the durable ledger so enforcement starts
-- from the same current-period message count that SMC reports.
update public.mail_entitlements e
set current_period_messages = coalesce((
  select sum(r.resend_inbound_messages + r.resend_outbound_messages)
  from public.mail_usage_monthly_rollups r
  where r.organization_id = e.organization_id
    and r.period_start = e.current_period_start
),0)::integer,
updated_at = now();

update public.mail_entitlements e
set current_period_ai_actions = coalesce((
  select u.actions
  from public.mail_guru_usage u
  where u.organization_id = e.organization_id
    and u.period_start = e.current_period_start
),0)::integer,
updated_at = now();

create or replace function public.capture_mail_message_usage_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_metric text;
  v_when timestamptz;
begin
  if new.direction = 'inbound' and new.status = 'received' and new.provider_message_id is not null then
    v_metric := 'resend_inbound_message';
    v_when := coalesce(new.received_at, new.created_at, now());
  elsif new.direction = 'outbound' and new.provider_message_id is not null and new.status not in ('draft','failed') then
    v_metric := 'resend_outbound_message';
    v_when := coalesce(new.sent_at, new.created_at, now());
  else
    return new;
  end if;

  insert into public.mail_usage_events
    (organization_id, mailbox_id, provider, metric, quantity, provider_reference, metadata, occurred_at)
  values
    (new.organization_id, new.mailbox_id, 'resend', v_metric, 1, 'mail_message:' || new.id::text,
     jsonb_build_object('message_status', new.status), v_when)
  on conflict do nothing;
  return new;
end;
$$;

revoke all on function public.capture_mail_message_usage_event() from public, anon, authenticated;
grant execute on function public.capture_mail_message_usage_event() to service_role;

drop trigger if exists mail_messages_capture_commercial_usage on public.mail_messages;
create trigger mail_messages_capture_commercial_usage
after insert or update of direction, status, provider_message_id, sent_at, received_at
on public.mail_messages
for each row execute function public.capture_mail_message_usage_event();

create or replace function public.capture_mail_attachment_scan_usage_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta bigint;
begin
  v_delta := coalesce(new.scan_attempts,0) - coalesce(old.scan_attempts,0);
  if v_delta <= 0 then return new; end if;

  insert into public.mail_usage_events
    (organization_id, mailbox_id, provider, metric, quantity, provider_reference, metadata, occurred_at)
  values
    (new.organization_id, new.mailbox_id, coalesce(nullif(new.scan_provider,''), 'cloudmersive'), 'cloudmersive_scan', v_delta,
     'mail_attachment:' || new.id::text || ':attempt:' || new.scan_attempts::text,
     jsonb_build_object('security_status', new.security_status), now())
  on conflict do nothing;
  return new;
end;
$$;

revoke all on function public.capture_mail_attachment_scan_usage_event() from public, anon, authenticated;
grant execute on function public.capture_mail_attachment_scan_usage_event() to service_role;

drop trigger if exists mail_attachments_capture_scan_usage on public.mail_attachments;
create trigger mail_attachments_capture_scan_usage
after update of scan_attempts on public.mail_attachments
for each row execute function public.capture_mail_attachment_scan_usage_event();

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
  return new;
end;
$$;

revoke all on function public.rollup_mail_usage_event() from public, anon, authenticated;
grant execute on function public.rollup_mail_usage_event() to service_role;

drop trigger if exists mail_usage_events_rollup on public.mail_usage_events;
create trigger mail_usage_events_rollup
after insert on public.mail_usage_events
for each row execute function public.rollup_mail_usage_event();

-- Service-role-only aggregate snapshot for SMC. The function is SECURITY INVOKER and has
-- no authenticated/anonymous execute permission; SMC calls it through its server-side admin client.
create or replace function public.mail_smc_commercial_usage(p_period_start date)
returns table (
  organization_id uuid,
  organization_name text,
  organization_slug text,
  module_enabled boolean,
  entitlement_status text,
  plan_key text,
  mailbox_limit integer,
  domain_limit integer,
  storage_limit_bytes bigint,
  monthly_message_limit integer,
  ai_actions_monthly_limit integer,
  entitlement_period_start date,
  entitlement_message_counter integer,
  entitlement_ai_counter integer,
  mailbox_count bigint,
  domain_count bigint,
  attachment_count bigint,
  storage_bytes numeric,
  clean_storage_bytes numeric,
  quarantine_storage_bytes numeric,
  metered_inbound_messages bigint,
  metered_outbound_messages bigint,
  metered_cloudmersive_scans bigint,
  metered_guru_actions integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with mail_orgs as (
    select o.id, o.name, o.slug,
           coalesce(g.enabled,false) as module_enabled,
           e.status as entitlement_status,
           e.plan_key,
           e.mailbox_limit,
           e.domain_limit,
           e.storage_limit_bytes,
           e.monthly_message_limit,
           e.ai_actions_monthly_limit,
           e.current_period_start as entitlement_period_start,
           e.current_period_messages as entitlement_message_counter,
           e.current_period_ai_actions as entitlement_ai_counter
    from public.organizations o
    left join public.org_module_grants g
      on g.organization_id = o.id and g.module_key = 'setu_mail'
    left join public.mail_entitlements e on e.organization_id = o.id
    where g.organization_id is not null or e.organization_id is not null
  ),
  boxes as (
    select organization_id, count(*) filter (where status = 'active') as mailbox_count
    from public.mail_mailboxes group by organization_id
  ),
  domains as (
    select organization_id, count(*) as domain_count
    from public.mail_domains group by organization_id
  ),
  attachments as (
    select organization_id,
      count(*) as attachment_count,
      coalesce(sum(size_bytes),0)::numeric as storage_bytes,
      coalesce(sum(size_bytes) filter (where security_status = 'clean'),0)::numeric as clean_storage_bytes,
      coalesce(sum(size_bytes) filter (where security_status in ('quarantined','scan_error')),0)::numeric as quarantine_storage_bytes
    from public.mail_attachments group by organization_id
  )
  select
    mo.id,
    mo.name,
    mo.slug,
    mo.module_enabled,
    mo.entitlement_status,
    mo.plan_key,
    mo.mailbox_limit,
    mo.domain_limit,
    mo.storage_limit_bytes,
    mo.monthly_message_limit,
    mo.ai_actions_monthly_limit,
    mo.entitlement_period_start,
    mo.entitlement_message_counter,
    mo.entitlement_ai_counter,
    coalesce(b.mailbox_count,0),
    coalesce(d.domain_count,0),
    coalesce(a.attachment_count,0),
    coalesce(a.storage_bytes,0),
    coalesce(a.clean_storage_bytes,0),
    coalesce(a.quarantine_storage_bytes,0),
    coalesce(r.resend_inbound_messages,0),
    coalesce(r.resend_outbound_messages,0),
    coalesce(r.cloudmersive_scans,0),
    coalesce(u.actions,0)
  from mail_orgs mo
  left join boxes b on b.organization_id = mo.id
  left join domains d on d.organization_id = mo.id
  left join attachments a on a.organization_id = mo.id
  left join public.mail_usage_monthly_rollups r on r.organization_id = mo.id and r.period_start = p_period_start
  left join public.mail_guru_usage u on u.organization_id = mo.id and u.period_start = p_period_start
  order by mo.name;
$$;

revoke all on function public.mail_smc_commercial_usage(date) from public, anon, authenticated;
grant execute on function public.mail_smc_commercial_usage(date) to service_role;

comment on table public.mail_usage_events is 'Durable Setu Mail provider-usage ledger. Does not meter platform transactional email.';
comment on table public.mail_provider_cost_catalog is 'Internal provider pricing reference catalog for SMC cost estimation; invoices remain source of truth.';
comment on function public.mail_smc_commercial_usage(date) is 'Service-role-only monthly Setu Mail commercial usage snapshot for SMC.';
