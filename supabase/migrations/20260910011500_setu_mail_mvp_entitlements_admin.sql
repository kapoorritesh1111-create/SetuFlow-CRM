-- Setu Mail MVP: paid-module entitlement, domain/mailbox administration, standard mailbox metadata.

alter table public.org_module_grants drop constraint if exists org_module_grants_module_key_check;
alter table public.org_module_grants add constraint org_module_grants_module_key_check
  check (module_key = any (array['full_crm'::text,'trade_show'::text,'orders_compliance'::text,'setu_guru'::text,'analytics'::text,'vcard'::text,'supplier_procurement'::text,'setu_mail'::text]));

create table if not exists public.mail_domains (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  domain text not null, provider text not null default 'resend', provider_domain_id text, status text not null default 'pending',
  region text, sending_status text not null default 'pending', receiving_status text not null default 'pending', dns_records jsonb not null default '[]'::jsonb,
  last_checked_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (organization_id, domain)
);
create table if not exists public.mail_aliases (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  mailbox_id uuid not null references public.mail_mailboxes(id) on delete cascade, address text not null, alias_type text not null default 'alias',
  is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (organization_id,address)
);
create table if not exists public.mail_signatures (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  mailbox_id uuid not null references public.mail_mailboxes(id) on delete cascade, user_id uuid not null, name text not null default 'Default',
  text_signature text, html_signature text, is_default boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.mail_attachments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  mailbox_id uuid not null references public.mail_mailboxes(id) on delete cascade, message_id uuid references public.mail_messages(id) on delete cascade,
  filename text not null, content_type text, size_bytes bigint, storage_path text, provider_attachment_id text, created_at timestamptz not null default now()
);
create table if not exists public.mail_entitlements (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_key text not null default 'starter', status text not null default 'active', mailbox_limit integer not null default 5, domain_limit integer not null default 1,
  storage_limit_bytes bigint not null default 5368709120, monthly_message_limit integer not null default 10000, ai_actions_monthly_limit integer not null default 500,
  current_period_start date not null default date_trunc('month',now())::date, current_period_messages integer not null default 0, current_period_ai_actions integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.mail_messages add column if not exists folder text not null default 'inbox';
alter table public.mail_messages add column if not exists is_starred boolean not null default false;
alter table public.mail_messages add column if not exists archived_at timestamptz;
alter table public.mail_messages add column if not exists trashed_at timestamptz;
alter table public.mail_messages add column if not exists draft_saved_at timestamptz;
alter table public.mail_messages add column if not exists message_id_header text;
alter table public.mail_messages add column if not exists in_reply_to text;
alter table public.mail_messages add column if not exists reference_headers text[] not null default '{}'::text[];
alter table public.mail_messages add column if not exists metadata jsonb not null default '{}'::jsonb;
update public.mail_messages set folder='sent' where direction='outbound' and folder='inbox';

alter table public.mail_domains enable row level security;
alter table public.mail_aliases enable row level security;
alter table public.mail_signatures enable row level security;
alter table public.mail_attachments enable row level security;
alter table public.mail_entitlements enable row level security;

drop policy if exists "mail members read domains" on public.mail_domains;
create policy "mail members read domains" on public.mail_domains for select to authenticated using (exists (select 1 from public.organization_members om where om.organization_id=mail_domains.organization_id and om.user_id=(select auth.uid()) and om.is_active=true));
drop policy if exists "mail admins manage domains" on public.mail_domains;
create policy "mail admins manage domains" on public.mail_domains for all to authenticated using (exists (select 1 from public.organization_members om join public.user_roles ur on ur.organization_member_id=om.id join public.roles r on r.id=ur.role_id where om.organization_id=mail_domains.organization_id and om.user_id=(select auth.uid()) and om.is_active=true and lower(r.name) in ('owner','admin'))) with check (exists (select 1 from public.organization_members om join public.user_roles ur on ur.organization_member_id=om.id join public.roles r on r.id=ur.role_id where om.organization_id=mail_domains.organization_id and om.user_id=(select auth.uid()) and om.is_active=true and lower(r.name) in ('owner','admin')));

drop policy if exists "mailbox users read aliases" on public.mail_aliases;
create policy "mailbox users read aliases" on public.mail_aliases for select to authenticated using (exists (select 1 from public.mail_mailboxes mb where mb.id=mail_aliases.mailbox_id and mb.user_id=(select auth.uid())) or exists (select 1 from public.organization_members om join public.user_roles ur on ur.organization_member_id=om.id join public.roles r on r.id=ur.role_id where om.organization_id=mail_aliases.organization_id and om.user_id=(select auth.uid()) and om.is_active=true and lower(r.name) in ('owner','admin')));
drop policy if exists "mail admins manage aliases" on public.mail_aliases;
create policy "mail admins manage aliases" on public.mail_aliases for all to authenticated using (exists (select 1 from public.organization_members om join public.user_roles ur on ur.organization_member_id=om.id join public.roles r on r.id=ur.role_id where om.organization_id=mail_aliases.organization_id and om.user_id=(select auth.uid()) and om.is_active=true and lower(r.name) in ('owner','admin'))) with check (exists (select 1 from public.organization_members om join public.user_roles ur on ur.organization_member_id=om.id join public.roles r on r.id=ur.role_id where om.organization_id=mail_aliases.organization_id and om.user_id=(select auth.uid()) and om.is_active=true and lower(r.name) in ('owner','admin')));

drop policy if exists "mailbox users manage signatures" on public.mail_signatures;
create policy "mailbox users manage signatures" on public.mail_signatures for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
drop policy if exists "mail admins read signatures" on public.mail_signatures;
create policy "mail admins read signatures" on public.mail_signatures for select to authenticated using (exists (select 1 from public.organization_members om join public.user_roles ur on ur.organization_member_id=om.id join public.roles r on r.id=ur.role_id where om.organization_id=mail_signatures.organization_id and om.user_id=(select auth.uid()) and om.is_active=true and lower(r.name) in ('owner','admin')));

drop policy if exists "mailbox users manage attachments" on public.mail_attachments;
create policy "mailbox users manage attachments" on public.mail_attachments for all to authenticated using (exists (select 1 from public.mail_mailboxes mb where mb.id=mail_attachments.mailbox_id and mb.user_id=(select auth.uid()))) with check (exists (select 1 from public.mail_mailboxes mb where mb.id=mail_attachments.mailbox_id and mb.user_id=(select auth.uid())));

drop policy if exists "mail members read entitlement" on public.mail_entitlements;
create policy "mail members read entitlement" on public.mail_entitlements for select to authenticated using (exists (select 1 from public.organization_members om where om.organization_id=mail_entitlements.organization_id and om.user_id=(select auth.uid()) and om.is_active=true));
