/*
PASS 9 DRAFT ONLY — DO NOT APPLY WITHOUT AUTHORIZATION
Purpose: database-level capability helper and example RPC gate.
Status: Not applied in Pass 9.

Draft helper target:

create or replace function public.app_has_workspace_capability(
  p_organization_id uuid,
  p_user_id uuid,
  p_capability text
)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = p_user_id
      and om.is_active = true
      and (
        (p_capability = 'catalog.manage' and om.role = any(array['owner','admin','manager'])) or
        (p_capability = 'settings.manage' and om.role = any(array['owner','admin','manager'])) or
        (p_capability = 'lead.manage' and om.role = any(array['owner','admin','manager','sales','operations','sourcing','procurement','contributor'])) or
        (p_capability = 'quote.send' and om.role = any(array['owner','admin','manager','sales'])) or
        (p_capability = 'compliance.review' and om.role = any(array['owner','admin','manager','operations'])) or
        (p_capability = 'reporting.view' and om.role = any(array['owner','admin','manager','sales','operations','contributor','viewer']))
      )
  );
$$;

Example RPC guard pattern:

if not public.app_has_workspace_capability(p_organization_id, p_actor_user_id, 'lead.manage') then
  raise exception 'insufficient_workspace_capability' using errcode = '42501';
end if;

Negative cases required before live apply:
- anon cannot execute privileged RPCs
- viewer cannot progress order
- viewer cannot update compliance
- sales cannot catalog manage
- operations cannot send quote
- inactive member cannot execute privileged RPCs
- cross-workspace user cannot mutate records
*/
