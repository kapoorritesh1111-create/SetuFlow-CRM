-- Durable invitation lifecycle separate from organization_members.
create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role_id uuid null references public.roles(id) on delete set null,
  invited_by_membership_id uuid not null references public.organization_members(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft','pending','sent','accepted','revoked','expired','failed')),
  token_hash text null,
  expires_at timestamptz null,
  last_sent_at timestamptz null,
  accepted_at timestamptz null,
  revoked_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_org_invitations_org_status on public.organization_invitations (organization_id, status);
create index if not exists idx_org_invitations_org_email on public.organization_invitations (organization_id, lower(email));
create unique index if not exists uq_org_invitations_org_email_active on public.organization_invitations (organization_id, lower(email))
where status in ('draft','pending','sent');

alter table public.organization_invitations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'organization_invitations' and policyname = 'organization_invitations_select'
  ) then
    create policy organization_invitations_select on public.organization_invitations
      for select using (
        exists (
          select 1
          from public.organization_members om
          join public.user_roles ur on ur.organization_member_id = om.id
          join public.roles r on r.id = ur.role_id
          where om.organization_id = organization_invitations.organization_id
            and om.user_id = auth.uid()
            and om.is_active = true
            and r.name in ('owner','admin')
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'organization_invitations' and policyname = 'organization_invitations_insert'
  ) then
    create policy organization_invitations_insert on public.organization_invitations
      for insert with check (
        exists (
          select 1
          from public.organization_members om
          join public.user_roles ur on ur.organization_member_id = om.id
          join public.roles r on r.id = ur.role_id
          where om.id = organization_invitations.invited_by_membership_id
            and om.organization_id = organization_invitations.organization_id
            and om.user_id = auth.uid()
            and om.is_active = true
            and r.name in ('owner','admin')
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'organization_invitations' and policyname = 'organization_invitations_update'
  ) then
    create policy organization_invitations_update on public.organization_invitations
      for update using (
        exists (
          select 1
          from public.organization_members om
          join public.user_roles ur on ur.organization_member_id = om.id
          join public.roles r on r.id = ur.role_id
          where om.organization_id = organization_invitations.organization_id
            and om.user_id = auth.uid()
            and om.is_active = true
            and r.name in ('owner','admin')
        )
      ) with check (
        exists (
          select 1
          from public.organization_members om
          join public.user_roles ur on ur.organization_member_id = om.id
          join public.roles r on r.id = ur.role_id
          where om.organization_id = organization_invitations.organization_id
            and om.user_id = auth.uid()
            and om.is_active = true
            and r.name in ('owner','admin')
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'organization_invitations' and policyname = 'organization_invitations_delete'
  ) then
    create policy organization_invitations_delete on public.organization_invitations
      for delete using (
        exists (
          select 1
          from public.organization_members om
          join public.user_roles ur on ur.organization_member_id = om.id
          join public.roles r on r.id = ur.role_id
          where om.organization_id = organization_invitations.organization_id
            and om.user_id = auth.uid()
            and om.is_active = true
            and r.name in ('owner','admin')
        )
      );
  end if;
end $$;
