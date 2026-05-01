/*
PASS 9 DRAFT ONLY — DO NOT APPLY WITHOUT AUTHORIZATION
Purpose: RLS policy strategy for tables that have RLS enabled but no policies.
Status: Not applied in Pass 9.

Do NOT add permissive policies just to clear the advisor warning.

Recommended patterns:

1. Internal/staging/import tables: add explicit deny-all policies or move them out of the exposed API schema.

-- Example deny-all read/write policies:
create policy "deny all read until scoped" on public.stg_lead_raw
  for select using (false);
create policy "deny all write until scoped" on public.stg_lead_raw
  for all using (false) with check (false);

2. Reference/list tables needed by authenticated users: add scoped policies after confirming organization_id/tenant boundary.

-- Example scoped authenticated read pattern:
create policy "authenticated scoped read" on public.quote_templates
  for select to authenticated
  using (organization_id in (
    select organization_id from public.organization_members
    where user_id = auth.uid() and is_active = true
  ));

3. Role/capability tables: avoid public read unless the app explicitly requires it.

Rollback: drop newly created policies by name and restore prior schema dump.
*/
