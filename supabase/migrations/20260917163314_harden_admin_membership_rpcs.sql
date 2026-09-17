-- Paid-client hardening: enforce authorization inside privileged membership RPCs.
-- Preserve service-role automation, but require signed-in owner/admin identity for
-- authenticated Data API calls and remove anonymous execute access.

create or replace function public.app_update_member_role_tx(p_payload jsonb)
returns table(membership_id uuid)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_organization_id uuid := nullif(trim(coalesce(p_payload->>'organization_id', '')), '')::uuid;
  v_actor_user_id uuid := nullif(trim(coalesce(p_payload->>'actor_user_id', '')), '')::uuid;
  v_membership_id uuid := nullif(trim(coalesce(p_payload->>'membership_id', '')), '')::uuid;
  v_role_id uuid := case
    when coalesce(p_payload->>'role_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (p_payload->>'role_id')::uuid
    else null
  end;
  v_audit_action text := coalesce(nullif(trim(coalesce(p_payload->>'audit_action', '')), ''), 'role_changed');
  v_previous jsonb := p_payload->'audit_previous';
  v_new jsonb := p_payload->'audit_new';
  v_metadata jsonb := coalesce(p_payload->'audit_metadata', '{}'::jsonb);
  v_service_role boolean := coalesce(auth.role(), '') = 'service_role';
begin
  if v_organization_id is null or v_membership_id is null then
    raise exception 'Organization and membership are required.' using errcode = '22023';
  end if;

  if not v_service_role then
    if auth.uid() is null then
      raise exception 'Authentication required.' using errcode = '42501';
    end if;
    if v_actor_user_id is null or v_actor_user_id <> auth.uid() then
      raise exception 'Actor identity mismatch.' using errcode = '42501';
    end if;
    if not public.is_org_admin(v_organization_id) and not public.is_setu_platform_admin() then
      raise exception 'Owner or admin permission required.' using errcode = '42501';
    end if;
  end if;

  perform 1 from public.organization_members where id = v_membership_id and organization_id = v_organization_id;
  if not found then
    raise exception 'Membership % not found in the active organization.', v_membership_id;
  end if;

  if v_role_id is not null and not exists (
    select 1 from public.roles r
    where r.id = v_role_id
      and (r.organization_id = v_organization_id or r.organization_id is null)
  ) then
    raise exception 'Role is not available in the active organization.' using errcode = '42501';
  end if;

  delete from public.user_roles where organization_member_id = v_membership_id;

  if v_role_id is not null then
    insert into public.user_roles (organization_member_id, role_id)
    values (v_membership_id, v_role_id);
  end if;

  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (
    v_organization_id,
    coalesce(v_actor_user_id, auth.uid()),
    v_audit_action,
    'organization_member',
    v_membership_id,
    jsonb_strip_nulls(jsonb_build_object('previous', v_previous, 'new', v_new, 'metadata', v_metadata))
  );

  return query select v_membership_id;
end;
$function$;

create or replace function public.app_set_membership_active_tx(p_payload jsonb)
returns table(membership_id uuid, is_active boolean)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_organization_id uuid := nullif(trim(coalesce(p_payload->>'organization_id', '')), '')::uuid;
  v_actor_user_id uuid := nullif(trim(coalesce(p_payload->>'actor_user_id', '')), '')::uuid;
  v_membership_id uuid := nullif(trim(coalesce(p_payload->>'membership_id', '')), '')::uuid;
  v_is_active boolean := coalesce((p_payload->>'is_active')::boolean, false);
  v_audit_action text := coalesce(nullif(trim(coalesce(p_payload->>'audit_action', '')), ''), case when v_is_active then 'membership_reactivated' else 'membership_removed' end);
  v_metadata jsonb := coalesce(p_payload->'audit_metadata', '{}'::jsonb);
  v_service_role boolean := coalesce(auth.role(), '') = 'service_role';
begin
  if v_organization_id is null or v_membership_id is null then
    raise exception 'Organization and membership are required.' using errcode = '22023';
  end if;

  if not v_service_role then
    if auth.uid() is null then
      raise exception 'Authentication required.' using errcode = '42501';
    end if;
    if v_actor_user_id is null or v_actor_user_id <> auth.uid() then
      raise exception 'Actor identity mismatch.' using errcode = '42501';
    end if;
    if not public.is_org_admin(v_organization_id) and not public.is_setu_platform_admin() then
      raise exception 'Owner or admin permission required.' using errcode = '42501';
    end if;
  end if;

  update public.organization_members
  set is_active = v_is_active,
      updated_at = timezone('utc', now())
  where id = v_membership_id
    and organization_id = v_organization_id;

  if not found then
    raise exception 'Membership % not found in the active organization.', v_membership_id;
  end if;

  if not v_is_active then
    delete from public.user_roles where organization_member_id = v_membership_id;
  end if;

  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (
    v_organization_id,
    coalesce(v_actor_user_id, auth.uid()),
    v_audit_action,
    'organization_member',
    v_membership_id,
    jsonb_build_object('metadata', v_metadata)
  );

  return query select v_membership_id, v_is_active;
end;
$function$;

revoke execute on function public.app_update_member_role_tx(jsonb) from anon;
revoke execute on function public.app_set_membership_active_tx(jsonb) from anon;
grant execute on function public.app_update_member_role_tx(jsonb) to authenticated, service_role;
grant execute on function public.app_set_membership_active_tx(jsonb) to authenticated, service_role;
