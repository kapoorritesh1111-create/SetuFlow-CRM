alter table public.mail_attachments
  add column if not exists security_status text not null default 'pending',
  add column if not exists scan_provider text,
  add column if not exists scan_engine text,
  add column if not exists scan_signature text,
  add column if not exists scan_attempts integer not null default 0,
  add column if not exists scanned_at timestamptz,
  add column if not exists scan_error text,
  add column if not exists content_sha256 text,
  add column if not exists quarantine_storage_path text,
  add column if not exists quarantined_at timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='mail_attachments_security_status_check') then
    alter table public.mail_attachments add constraint mail_attachments_security_status_check
      check (security_status in ('pending','scanning','clean','quarantined','scan_error'));
  end if;
  if not exists (select 1 from pg_constraint where conname='mail_attachments_scan_attempts_check') then
    alter table public.mail_attachments add constraint mail_attachments_scan_attempts_check check (scan_attempts >= 0);
  end if;
end $$;

create index if not exists mail_attachments_security_status_idx
  on public.mail_attachments (organization_id, security_status, created_at);
create index if not exists mail_attachments_quarantine_retention_idx
  on public.mail_attachments (organization_id, quarantined_at)
  where security_status in ('quarantined','scan_error');

create table if not exists public.mail_retention_policies (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  trash_retention_days integer not null default 30 check (trash_retention_days between 1 and 365),
  quarantine_retention_days integer not null default 30 check (quarantine_retention_days between 1 and 365),
  orphan_attachment_retention_days integer not null default 7 check (orphan_attachment_retention_days between 1 and 90),
  enabled boolean not null default true,
  last_run_at timestamptz,
  last_run_status text check (last_run_status is null or last_run_status in ('ok','partial','failed')),
  last_run_summary jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mail_retention_policies enable row level security;
grant select, insert, update, delete on table public.mail_retention_policies to authenticated;

DROP POLICY IF EXISTS "mail admins manage retention policies" ON public.mail_retention_policies;
create policy "mail admins manage retention policies"
  on public.mail_retention_policies
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members om
      join public.user_roles ur on ur.organization_member_id = om.id
      join public.roles r on r.id = ur.role_id
      where om.organization_id = mail_retention_policies.organization_id
        and om.user_id = (select auth.uid())
        and om.is_active = true
        and lower(r.name) = any(array['owner'::text,'admin'::text])
    )
  )
  with check (
    exists (
      select 1
      from public.organization_members om
      join public.user_roles ur on ur.organization_member_id = om.id
      join public.roles r on r.id = ur.role_id
      where om.organization_id = mail_retention_policies.organization_id
        and om.user_id = (select auth.uid())
        and om.is_active = true
        and lower(r.name) = any(array['owner'::text,'admin'::text])
    )
  );

insert into public.mail_retention_policies (organization_id)
select g.organization_id
from public.org_module_grants g
where g.module_key='setu_mail' and g.enabled=true
on conflict (organization_id) do nothing;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'setu-mail-quarantine',
  'setu-mail-quarantine',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
