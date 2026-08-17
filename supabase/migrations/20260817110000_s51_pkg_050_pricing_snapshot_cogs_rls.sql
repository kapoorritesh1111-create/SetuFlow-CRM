-- S51-PKG-050
-- quote_pricing_snapshots contains immutable source-of-truth pricing payloads.
-- Packaging v4 adds raw Master IDs/rates, COGS, wastage and margin to that
-- payload, so ordinary org members must not be able to SELECT it directly.
begin;

-- Two legacy ALL policies currently overlap on production. Remove both before
-- replacing them with command-specific policies.
drop policy if exists qps_org_access on public.quote_pricing_snapshots;
drop policy if exists quote_pricing_snapshots_org_access on public.quote_pricing_snapshots;

drop policy if exists quote_pricing_snapshots_admin_select on public.quote_pricing_snapshots;
create policy quote_pricing_snapshots_admin_select
  on public.quote_pricing_snapshots
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.quote_versions qv
      join public.quotes q on q.id = qv.quote_id
      where qv.id = quote_pricing_snapshots.quote_version_id
        and public.is_org_admin(q.organization_id)
    )
  );

-- Preserve compatibility for existing authenticated quote workflows. The
-- canonical version transaction is SECURITY DEFINER, but command-specific
-- member write policies avoid an unrelated regression in older write paths.
drop policy if exists quote_pricing_snapshots_member_insert on public.quote_pricing_snapshots;
create policy quote_pricing_snapshots_member_insert
  on public.quote_pricing_snapshots
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.quote_versions qv
      join public.quotes q on q.id = qv.quote_id
      where qv.id = quote_pricing_snapshots.quote_version_id
        and public.is_org_member(q.organization_id)
    )
  );

drop policy if exists quote_pricing_snapshots_member_update on public.quote_pricing_snapshots;
create policy quote_pricing_snapshots_member_update
  on public.quote_pricing_snapshots
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.quote_versions qv
      join public.quotes q on q.id = qv.quote_id
      where qv.id = quote_pricing_snapshots.quote_version_id
        and public.is_org_member(q.organization_id)
    )
  )
  with check (
    exists (
      select 1
      from public.quote_versions qv
      join public.quotes q on q.id = qv.quote_id
      where qv.id = quote_pricing_snapshots.quote_version_id
        and public.is_org_member(q.organization_id)
    )
  );

drop policy if exists quote_pricing_snapshots_member_delete on public.quote_pricing_snapshots;
create policy quote_pricing_snapshots_member_delete
  on public.quote_pricing_snapshots
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.quote_versions qv
      join public.quotes q on q.id = qv.quote_id
      where qv.id = quote_pricing_snapshots.quote_version_id
        and public.is_org_member(q.organization_id)
    )
  );

commit;
