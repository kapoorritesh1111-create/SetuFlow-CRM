create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  icon text,
  priority text not null default 'normal' check (priority in ('normal', 'high', 'critical')),
  entity_type text,
  entity_id uuid,
  entity_ref text,
  action_url text,
  read boolean not null default false,
  read_at timestamptz,
  channels_sent text[],
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists notif_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notif_org_idx on public.notifications (organization_id, created_at desc);
create index if not exists notif_unread_user_idx on public.notifications (user_id, read, created_at desc) where archived_at is null;

alter table public.notifications enable row level security;

do $$
begin
  create policy "Users read own notifs" on public.notifications
    for select using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "Users update own notification read state" on public.notifications
    for update using (user_id = auth.uid())
    with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

create table if not exists public.workspace_notification_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  notif_type text not null,
  in_app boolean not null default true,
  push boolean not null default true,
  email boolean not null default false,
  whatsapp boolean not null default false,
  sms boolean not null default false,
  is_locked boolean not null default false,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  unique (organization_id, notif_type)
);

create index if not exists workspace_notification_settings_org_idx
  on public.workspace_notification_settings (organization_id, notif_type);

alter table public.workspace_notification_settings enable row level security;

do $$
begin
  create policy "Admins manage workspace notif settings" on public.workspace_notification_settings
    for all using (public.is_org_admin(organization_id))
    with check (public.is_org_admin(organization_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "Members read workspace notif settings" on public.workspace_notification_settings
    for select using (public.is_org_member(organization_id));
exception when duplicate_object then null;
end $$;

create table if not exists public.user_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  notif_type text not null,
  in_app boolean not null default true,
  push boolean not null default true,
  email boolean not null default false,
  whatsapp boolean not null default false,
  sms boolean not null default false,
  unique (user_id, organization_id, notif_type)
);

create index if not exists user_notification_preferences_user_org_idx
  on public.user_notification_preferences (user_id, organization_id, notif_type);

alter table public.user_notification_preferences enable row level security;

do $$
begin
  create policy "Users manage own notif prefs" on public.user_notification_preferences
    for all using (user_id = auth.uid() and public.is_org_member(organization_id))
    with check (user_id = auth.uid() and public.is_org_member(organization_id));
exception when duplicate_object then null;
end $$;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  auth_key text not null,
  p256dh text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id, endpoint)
);

create index if not exists push_subscriptions_user_org_idx
  on public.push_subscriptions (user_id, organization_id);

alter table public.push_subscriptions enable row level security;

do $$
begin
  create policy "Users manage own push subs" on public.push_subscriptions
    for all using (user_id = auth.uid() and public.is_org_member(organization_id))
    with check (user_id = auth.uid() and public.is_org_member(organization_id));
exception when duplicate_object then null;
end $$;

create or replace function public.get_effective_notif_pref(
  p_user_id uuid,
  p_org_id uuid,
  p_type text,
  p_channel text
) returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_locked boolean;
  v_workspace boolean;
  v_user boolean;
begin
  if p_channel not in ('in_app', 'push', 'email', 'whatsapp', 'sms') then
    raise exception 'Unsupported notification channel: %', p_channel;
  end if;

  select
    is_locked,
    case p_channel
      when 'in_app' then in_app
      when 'push' then push
      when 'email' then email
      when 'whatsapp' then whatsapp
      when 'sms' then sms
    end
  into v_locked, v_workspace
  from public.workspace_notification_settings
  where organization_id = p_org_id and notif_type = p_type;

  if coalesce(v_locked, false) then
    return coalesce(v_workspace, false);
  end if;

  select
    case p_channel
      when 'in_app' then in_app
      when 'push' then push
      when 'email' then email
      when 'whatsapp' then whatsapp
      when 'sms' then sms
    end
  into v_user
  from public.user_notification_preferences
  where user_id = p_user_id
    and organization_id = p_org_id
    and notif_type = p_type;

  return coalesce(v_user, v_workspace, false);
end;
$$;

insert into public.workspace_notification_settings (
  organization_id,
  notif_type,
  in_app,
  push,
  email,
  whatsapp,
  sms,
  is_locked
)
select
  o.id,
  t.notif_type,
  t.in_app,
  t.push,
  t.email,
  t.whatsapp,
  t.sms,
  t.is_locked
from public.organizations o
cross join (values
  ('quote_accepted', true, true, true, true, false, false),
  ('compliance_blocker', true, true, true, true, true, true),
  ('approval_request', true, true, true, false, false, false),
  ('rfq_received', true, true, true, true, false, false),
  ('payment_received', true, true, true, true, false, false),
  ('order_stage', true, true, false, false, false, false),
  ('task_due', true, true, true, false, false, false),
  ('lead_stage', true, false, false, false, false, false),
  ('quote_opened', true, false, false, false, false, false)
) as t(notif_type, in_app, push, email, whatsapp, sms, is_locked)
on conflict (organization_id, notif_type) do nothing;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;
