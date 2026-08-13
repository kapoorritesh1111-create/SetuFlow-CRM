-- S51-CAT-011 hardening: enforce tenant-consistent brochure shares and atomic open tracking.

create or replace function public.enforce_catalog_brochure_share_scope()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.catalog_brochures brochure
    where brochure.id = new.brochure_id
      and brochure.organization_id = new.organization_id
  ) then
    raise exception 'Brochure does not belong to the selected organization.';
  end if;

  if new.lead_id is not null and not exists (
    select 1
    from public.leads lead_row
    where lead_row.id = new.lead_id
      and lead_row.organization_id = new.organization_id
  ) then
    raise exception 'Lead does not belong to the selected organization.';
  end if;

  if new.intake_id is not null and not exists (
    select 1
    from public.lead_intake_staging intake_row
    where intake_row.id = new.intake_id
      and intake_row.organization_id = new.organization_id
  ) then
    raise exception 'Inquiry does not belong to the selected organization.';
  end if;

  return new;
end;
$$;

drop trigger if exists catalog_brochure_shares_scope_guard on public.catalog_brochure_shares;
create trigger catalog_brochure_shares_scope_guard
before insert or update of organization_id, brochure_id, lead_id, intake_id
on public.catalog_brochure_shares
for each row
execute function public.enforce_catalog_brochure_share_scope();

drop policy if exists catalog_brochure_shares_member_access on public.catalog_brochure_shares;
drop policy if exists catalog_brochure_shares_member_select on public.catalog_brochure_shares;
drop policy if exists catalog_brochure_shares_member_insert on public.catalog_brochure_shares;
drop policy if exists catalog_brochure_shares_admin_delete on public.catalog_brochure_shares;

create policy catalog_brochure_shares_member_select
  on public.catalog_brochure_shares
  for select
  using (public.is_org_member(organization_id));

create policy catalog_brochure_shares_member_insert
  on public.catalog_brochure_shares
  for insert
  with check (
    public.is_org_member(organization_id)
    and exists (
      select 1
      from public.catalog_brochures brochure
      where brochure.id = catalog_brochure_shares.brochure_id
        and brochure.organization_id = catalog_brochure_shares.organization_id
        and brochure.is_active = true
    )
    and (
      catalog_brochure_shares.lead_id is null
      or exists (
        select 1
        from public.leads lead_row
        where lead_row.id = catalog_brochure_shares.lead_id
          and lead_row.organization_id = catalog_brochure_shares.organization_id
      )
    )
    and (
      catalog_brochure_shares.intake_id is null
      or exists (
        select 1
        from public.lead_intake_staging intake_row
        where intake_row.id = catalog_brochure_shares.intake_id
          and intake_row.organization_id = catalog_brochure_shares.organization_id
      )
    )
  );

create policy catalog_brochure_shares_admin_delete
  on public.catalog_brochure_shares
  for delete
  using (public.is_org_admin(organization_id));

create or replace function public.increment_catalog_brochure_share_open(p_share_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.catalog_brochure_shares
  set open_count = open_count + 1,
      last_opened_at = now()
  where id = p_share_id;
$$;

revoke all on function public.increment_catalog_brochure_share_open(uuid) from public;
revoke all on function public.increment_catalog_brochure_share_open(uuid) from anon;
revoke all on function public.increment_catalog_brochure_share_open(uuid) from authenticated;
grant execute on function public.increment_catalog_brochure_share_open(uuid) to service_role;

comment on function public.enforce_catalog_brochure_share_scope() is 'Rejects brochure share rows whose brochure, lead, or inbound inquiry belongs to a different organization.';
comment on function public.increment_catalog_brochure_share_open(uuid) is 'Atomically increments buyer brochure open tracking. Service-role only.';
