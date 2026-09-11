alter table public.mail_mailboxes alter column user_id drop not null;
create table if not exists public.mail_mailbox_access (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 mailbox_id uuid not null references public.mail_mailboxes(id) on delete cascade, user_id uuid not null,
 access_role text not null default 'member' check (access_role in ('owner','member','delegate')),
 can_read boolean not null default true, can_send boolean not null default true, can_manage boolean not null default false,
 is_primary boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(mailbox_id,user_id));
create unique index if not exists mail_mailbox_access_one_primary_idx on public.mail_mailbox_access(mailbox_id) where is_primary=true;
create index if not exists mail_mailbox_access_user_idx on public.mail_mailbox_access(organization_id,user_id);
create index if not exists mail_mailbox_access_mailbox_idx on public.mail_mailbox_access(mailbox_id);
insert into public.mail_mailbox_access(organization_id,mailbox_id,user_id,access_role,can_read,can_send,can_manage,is_primary)
select organization_id,id,user_id,'owner',true,true,true,true from public.mail_mailboxes where user_id is not null
on conflict(mailbox_id,user_id) do update set access_role='owner',can_read=true,can_send=true,can_manage=true,is_primary=true,updated_at=now();
alter table public.mail_mailbox_access enable row level security;
create policy "mail admins manage mailbox access" on public.mail_mailbox_access for all to authenticated
using (exists(select 1 from public.organization_members om join public.user_roles ur on ur.organization_member_id=om.id join public.roles r on r.id=ur.role_id where om.organization_id=mail_mailbox_access.organization_id and om.user_id=(select auth.uid()) and om.is_active=true and lower(r.name)=any(array['owner','admin'])))
with check (exists(select 1 from public.organization_members om join public.user_roles ur on ur.organization_member_id=om.id join public.roles r on r.id=ur.role_id where om.organization_id=mail_mailbox_access.organization_id and om.user_id=(select auth.uid()) and om.is_active=true and lower(r.name)=any(array['owner','admin'])));
create policy "mailbox assignees read access" on public.mail_mailbox_access for select to authenticated using(user_id=(select auth.uid()));
grant select,insert,update,delete on public.mail_mailbox_access to authenticated;
create policy "mail admins manage mailboxes" on public.mail_mailboxes for all to authenticated
using (exists(select 1 from public.organization_members om join public.user_roles ur on ur.organization_member_id=om.id join public.roles r on r.id=ur.role_id where om.organization_id=mail_mailboxes.organization_id and om.user_id=(select auth.uid()) and om.is_active=true and lower(r.name)=any(array['owner','admin'])))
with check (exists(select 1 from public.organization_members om join public.user_roles ur on ur.organization_member_id=om.id join public.roles r on r.id=ur.role_id where om.organization_id=mail_mailboxes.organization_id and om.user_id=(select auth.uid()) and om.is_active=true and lower(r.name)=any(array['owner','admin'])));
create policy "mailbox assignees read mailboxes" on public.mail_mailboxes for select to authenticated using(exists(select 1 from public.mail_mailbox_access ma where ma.mailbox_id=mail_mailboxes.id and ma.user_id=(select auth.uid())));