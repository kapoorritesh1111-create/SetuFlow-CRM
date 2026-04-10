begin;

create or replace function public.app_finalize_invitation_acceptance_tx(p_payload jsonb)
returns table(invitation_id uuid, membership_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation_id uuid := nullif(trim(coalesce(p_payload->>'invitation_id', '')), '')::uuid;
  v_organization_id uuid := nullif(trim(coalesce(p_payload->>'organization_id', '')), '')::uuid;
  v_user_id uuid := nullif(trim(coalesce(p_payload->>'user_id', '')), '')::uuid;
  v_email text := lower(trim(coalesce(p_payload->>'email', '')));
  v_full_name text := nullif(trim(coalesce(p_payload->>'full_name', '')), '');
  v_username text := nullif(trim(coalesce(p_payload->>'username', '')), '');
  v_accepted_via text := coalesce(nullif(trim(coalesce(p_payload->>'accepted_via', '')), ''), 'existing_session');
  v_role_id uuid;
  v_membership_id uuid;
  v_existing_status text;
  v_existing_metadata jsonb;
  v_now timestamptz := timezone('utc', now());
begin
  select role_id, status, metadata
  into v_role_id, v_existing_status, v_existing_metadata
  from public.organization_invitations
  where id = v_invitation_id
    and organization_id = v_organization_id
  for update;

  if not found then
    raise exception 'Invitation % not found in the active organization.', v_invitation_id;
  end if;

  if v_existing_status not in ('draft', 'pending', 'sent') then
    raise exception 'Invitation % is not open for acceptance.', v_invitation_id;
  end if;

  insert into public.profiles (id, email, full_name, username)
  values (v_user_id, v_email, v_full_name, v_username)
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        username = coalesce(excluded.username, public.profiles.username);

  insert into public.organization_members (organization_id, user_id, is_active)
  values (v_organization_id, v_user_id, true)
  on conflict (organization_id, user_id) do update
    set is_active = true,
        updated_at = v_now
  returning id into v_membership_id;

  delete from public.user_roles where organization_member_id = v_membership_id;

  if v_role_id is not null then
    insert into public.user_roles (organization_member_id, role_id)
    values (v_membership_id, v_role_id);
  end if;

  update public.organization_invitations
  set status = 'accepted',
      accepted_at = v_now,
      metadata = coalesce(v_existing_metadata, '{}'::jsonb) || jsonb_build_object(
        'accepted_user_id', v_user_id,
        'accepted_via', v_accepted_via
      ),
      updated_at = v_now
  where id = v_invitation_id
    and organization_id = v_organization_id;

  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (
    v_organization_id,
    v_user_id,
    'invitation_accepted',
    'invitation',
    v_invitation_id,
    jsonb_build_object('metadata', jsonb_build_object('membership_id', v_membership_id, 'accepted_via', v_accepted_via))
  );

  return query select v_invitation_id, v_membership_id;
end;
$$;

commit;
