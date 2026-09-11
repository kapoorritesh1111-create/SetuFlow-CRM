create table if not exists public.organization_member_product_access (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  crm_enabled boolean not null default true,
  mail_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,user_id)
);
create index if not exists organization_member_product_access_org_idx on public.organization_member_product_access(organization_id);
create index if not exists organization_member_product_access_user_idx on public.organization_member_product_access(user_id);
insert into public.organization_member_product_access(organization_id,user_id,crm_enabled,mail_enabled)
select om.organization_id,om.user_id,true,exists(select 1 from public.mail_mailbox_access ma where ma.organization_id=om.organization_id and ma.user_id=om.user_id)
from public.organization_members om where om.user_id is not null
on conflict(organization_id,user_id) do update set mail_enabled=excluded.mail_enabled,updated_at=now();
alter table public.organization_member_product_access enable row level security;
create policy "members read own product access" on public.organization_member_product_access for select to authenticated using(user_id=(select auth.uid()));
create policy "admins manage product access" on public.organization_member_product_access for all to authenticated
using (exists(select 1 from public.organization_members om join public.user_roles ur on ur.organization_member_id=om.id join public.roles r on r.id=ur.role_id where om.organization_id=organization_member_product_access.organization_id and om.user_id=(select auth.uid()) and om.is_active=true and lower(r.name)=any(array['owner','admin'])))
with check (exists(select 1 from public.organization_members om join public.user_roles ur on ur.organization_member_id=om.id join public.roles r on r.id=ur.role_id where om.organization_id=organization_member_product_access.organization_id and om.user_id=(select auth.uid()) and om.is_active=true and lower(r.name)=any(array['owner','admin'])));
grant select,insert,update,delete on public.organization_member_product_access to authenticated;
create or replace function public.app_apply_invitation_product_access(p_invitation_id uuid,p_user_id uuid) returns void language plpgsql security definer set search_path=public as $$ declare v_org uuid; v_meta jsonb; v_scope text; begin select organization_id,coalesce(metadata,'{}'::jsonb) into v_org,v_meta from public.organization_invitations where id=p_invitation_id; if v_org is null then raise exception 'Invitation not found'; end if; v_scope:=coalesce(v_meta->>'product_access','crm'); if v_scope not in ('crm','mail','both') then v_scope:='crm'; end if; insert into public.organization_member_product_access(organization_id,user_id,crm_enabled,mail_enabled) values(v_org,p_user_id,v_scope in ('crm','both'),v_scope in ('mail','both')) on conflict(organization_id,user_id) do update set crm_enabled=excluded.crm_enabled,mail_enabled=excluded.mail_enabled,updated_at=now(); end $$;
revoke all on function public.app_apply_invitation_product_access(uuid,uuid) from public,anon,authenticated;
grant execute on function public.app_apply_invitation_product_access(uuid,uuid) to service_role;
