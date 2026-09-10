create table if not exists public.mail_mailboxes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  address text not null,
  display_name text,
  status text not null default 'active' check (status in ('active','disabled')),
  inbound_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, address)
);

create index if not exists mail_mailboxes_org_user_idx on public.mail_mailboxes (organization_id, user_id);

create table if not exists public.mail_threads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mailbox_id uuid not null references public.mail_mailboxes(id) on delete cascade,
  subject text not null default '',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mail_threads_mailbox_last_idx on public.mail_threads (mailbox_id, last_message_at desc);

create table if not exists public.mail_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mailbox_id uuid not null references public.mail_mailboxes(id) on delete cascade,
  thread_id uuid references public.mail_threads(id) on delete set null,
  provider_message_id text,
  direction text not null check (direction in ('inbound','outbound')),
  status text not null default 'queued' check (status in ('queued','sent','delivered','received','failed')),
  from_address text not null,
  to_addresses text[] not null default '{}',
  cc_addresses text[] not null default '{}',
  bcc_addresses text[] not null default '{}',
  subject text not null default '',
  text_body text,
  html_body text,
  is_read boolean not null default false,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mail_messages_mailbox_created_idx on public.mail_messages (mailbox_id, created_at desc);
create unique index if not exists mail_messages_provider_id_idx on public.mail_messages (provider_message_id) where provider_message_id is not null;

alter table public.mail_mailboxes enable row level security;
alter table public.mail_threads enable row level security;
alter table public.mail_messages enable row level security;

grant select, insert, update, delete on public.mail_mailboxes to authenticated;
grant select, insert, update, delete on public.mail_threads to authenticated;
grant select, insert, update, delete on public.mail_messages to authenticated;

create policy "mailbox users read own mailboxes" on public.mail_mailboxes for select to authenticated using (
  user_id = (select auth.uid()) and exists (
    select 1 from public.organization_members om
    where om.organization_id = mail_mailboxes.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
);

create policy "mailbox users create own mailboxes" on public.mail_mailboxes for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.organization_members om
    where om.organization_id = mail_mailboxes.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
);

create policy "mailbox users update own mailboxes" on public.mail_mailboxes for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "mailbox users read own threads" on public.mail_threads for select to authenticated using (
  exists (select 1 from public.mail_mailboxes mb where mb.id = mail_threads.mailbox_id and mb.user_id = (select auth.uid()))
);

create policy "mailbox users create own threads" on public.mail_threads for insert to authenticated with check (
  exists (select 1 from public.mail_mailboxes mb where mb.id = mail_threads.mailbox_id and mb.user_id = (select auth.uid()))
);

create policy "mailbox users update own threads" on public.mail_threads for update to authenticated
using (exists (select 1 from public.mail_mailboxes mb where mb.id = mail_threads.mailbox_id and mb.user_id = (select auth.uid())))
with check (exists (select 1 from public.mail_mailboxes mb where mb.id = mail_threads.mailbox_id and mb.user_id = (select auth.uid())));

create policy "mailbox users read own messages" on public.mail_messages for select to authenticated using (
  exists (select 1 from public.mail_mailboxes mb where mb.id = mail_messages.mailbox_id and mb.user_id = (select auth.uid()))
);

create policy "mailbox users create own messages" on public.mail_messages for insert to authenticated with check (
  exists (select 1 from public.mail_mailboxes mb where mb.id = mail_messages.mailbox_id and mb.user_id = (select auth.uid()))
);

create policy "mailbox users update own messages" on public.mail_messages for update to authenticated
using (exists (select 1 from public.mail_mailboxes mb where mb.id = mail_messages.mailbox_id and mb.user_id = (select auth.uid())))
with check (exists (select 1 from public.mail_mailboxes mb where mb.id = mail_messages.mailbox_id and mb.user_id = (select auth.uid())));
