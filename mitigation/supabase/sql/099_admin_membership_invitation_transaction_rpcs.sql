begin;

create or replace function public.app_update_member_role_tx(p_payload jsonb)
returns table(membership_id uuid)
language plpgsql
security definer
set search_path = public
as $$
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
begin
  perform 1 from public.organization_members where id = v_membership_id and organization_id = v_organization_id;
  if not found then
    raise exception 'Membership % not found in the active organization.', v_membership_id;
  end if;

  delete from public.user_roles where organization_member_id = v_membership_id;

  if v_role_id is not null then
    insert into public.user_roles (organization_member_id, role_id)
    values (v_membership_id, v_role_id);
  end if;

  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (
    v_organization_id,
    v_actor_user_id,
    v_audit_action,
    'organization_member',
    v_membership_id,
    jsonb_strip_nulls(jsonb_build_object('previous', v_previous, 'new', v_new, 'metadata', v_metadata))
  );

  return query select v_membership_id;
end;
$$;

create or replace function public.app_update_invitation_role_tx(p_payload jsonb)
returns table(invitation_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid := nullif(trim(coalesce(p_payload->>'organization_id', '')), '')::uuid;
  v_actor_user_id uuid := nullif(trim(coalesce(p_payload->>'actor_user_id', '')), '')::uuid;
  v_invitation_id uuid := nullif(trim(coalesce(p_payload->>'invitation_id', '')), '')::uuid;
  v_role_id uuid := case
    when coalesce(p_payload->>'role_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (p_payload->>'role_id')::uuid
    else null
  end;
  v_previous jsonb := p_payload->'audit_previous';
  v_new jsonb := p_payload->'audit_new';
begin
  update public.organization_invitations
  set role_id = v_role_id,
      updated_at = timezone('utc', now())
  where id = v_invitation_id
    and organization_id = v_organization_id;

  if not found then
    raise exception 'Invitation % not found in the active organization.', v_invitation_id;
  end if;

  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (
    v_organization_id,
    v_actor_user_id,
    'role_changed',
    'invitation',
    v_invitation_id,
    jsonb_strip_nulls(jsonb_build_object('previous', v_previous, 'new', v_new))
  );

  return query select v_invitation_id;
end;
$$;

create or replace function public.app_upsert_invitation_tx(p_payload jsonb)
returns table(invitation_id uuid, operation text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid := nullif(trim(coalesce(p_payload->>'organization_id', '')), '')::uuid;
  v_actor_user_id uuid := nullif(trim(coalesce(p_payload->>'actor_user_id', '')), '')::uuid;
  v_invited_by_membership_id uuid := nullif(trim(coalesce(p_payload->>'invited_by_membership_id', '')), '')::uuid;
  v_existing_invitation_id uuid := case
    when coalesce(p_payload->>'existing_invitation_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (p_payload->>'existing_invitation_id')::uuid
    else null
  end;
  v_role_id uuid := case
    when coalesce(p_payload->>'role_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (p_payload->>'role_id')::uuid
    else null
  end;
  v_email text := lower(trim(coalesce(p_payload->>'email', '')));
  v_expires_at timestamptz := nullif(trim(coalesce(p_payload->>'expires_at', '')), '')::timestamptz;
  v_metadata jsonb := coalesce(p_payload->'metadata', '{}'::jsonb);
  v_previous jsonb := p_payload->'audit_previous';
  v_new jsonb := p_payload->'audit_new';
  v_operation text;
begin
  if v_existing_invitation_id is not null then
    update public.organization_invitations
    set role_id = v_role_id,
        expires_at = v_expires_at,
        metadata = v_metadata,
        updated_at = timezone('utc', now())
    where id = v_existing_invitation_id
      and organization_id = v_organization_id
    returning id into v_existing_invitation_id;

    if v_existing_invitation_id is null then
      raise exception 'Invitation % not found in the active organization.', coalesce(p_payload->>'existing_invitation_id', '');
    end if;

    insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
    values (
      v_organization_id,
      v_actor_user_id,
      'invitation_updated',
      'invitation',
      v_existing_invitation_id,
      jsonb_strip_nulls(jsonb_build_object(
        'previous', v_previous,
        'new', v_new,
        'metadata', jsonb_build_object('email', v_email, 'reason', 'existing-open-invitation-refreshed')
      ))
    );

    return query select v_existing_invitation_id, 'updated'::text;
  end if;

  insert into public.organization_invitations (
    organization_id,
    email,
    role_id,
    invited_by_membership_id,
    status,
    expires_at,
    metadata
  )
  values (
    v_organization_id,
    v_email,
    v_role_id,
    v_invited_by_membership_id,
    'draft',
    v_expires_at,
    v_metadata
  )
  returning id into v_existing_invitation_id;

  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (
    v_organization_id,
    v_actor_user_id,
    'invitation_created',
    'invitation',
    v_existing_invitation_id,
    jsonb_strip_nulls(jsonb_build_object('new', v_new))
  );

  return query select v_existing_invitation_id, 'created'::text;
end;
$$;

create or replace function public.app_finalize_invitation_delivery_tx(p_payload jsonb)
returns table(invitation_id uuid, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid := nullif(trim(coalesce(p_payload->>'organization_id', '')), '')::uuid;
  v_actor_user_id uuid := nullif(trim(coalesce(p_payload->>'actor_user_id', '')), '')::uuid;
  v_invitation_id uuid := nullif(trim(coalesce(p_payload->>'invitation_id', '')), '')::uuid;
  v_status text := lower(trim(coalesce(p_payload->>'status', '')));
  v_token_hash text := nullif(trim(coalesce(p_payload->>'token_hash', '')), '');
  v_last_sent_at timestamptz := nullif(trim(coalesce(p_payload->>'last_sent_at', '')), '')::timestamptz;
  v_revoked_at timestamptz := nullif(trim(coalesce(p_payload->>'revoked_at', '')), '')::timestamptz;
  v_metadata jsonb := coalesce(p_payload->'metadata', '{}'::jsonb);
  v_audit_action text := coalesce(nullif(trim(coalesce(p_payload->>'audit_action', '')), ''), 'invitation_sent');
begin
  update public.organization_invitations
  set status = v_status,
      token_hash = case when v_status = 'sent' then v_token_hash else token_hash end,
      last_sent_at = case when v_status = 'sent' then v_last_sent_at else last_sent_at end,
      revoked_at = case when v_status = 'revoked' then v_revoked_at else revoked_at end,
      metadata = v_metadata,
      updated_at = timezone('utc', now())
  where id = v_invitation_id
    and organization_id = v_organization_id;

  if not found then
    raise exception 'Invitation % not found in the active organization.', v_invitation_id;
  end if;

  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (
    v_organization_id,
    v_actor_user_id,
    v_audit_action,
    'invitation',
    v_invitation_id,
    jsonb_build_object('metadata', jsonb_build_object('status', v_status))
  );

  return query select v_invitation_id, v_status;
end;
$$;

create or replace function public.app_set_membership_active_tx(p_payload jsonb)
returns table(membership_id uuid, is_active boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid := nullif(trim(coalesce(p_payload->>'organization_id', '')), '')::uuid;
  v_actor_user_id uuid := nullif(trim(coalesce(p_payload->>'actor_user_id', '')), '')::uuid;
  v_membership_id uuid := nullif(trim(coalesce(p_payload->>'membership_id', '')), '')::uuid;
  v_is_active boolean := coalesce((p_payload->>'is_active')::boolean, false);
  v_audit_action text := coalesce(nullif(trim(coalesce(p_payload->>'audit_action', '')), ''), case when v_is_active then 'membership_reactivated' else 'membership_removed' end);
  v_metadata jsonb := coalesce(p_payload->'audit_metadata', '{}'::jsonb);
begin
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
    v_actor_user_id,
    v_audit_action,
    'organization_member',
    v_membership_id,
    jsonb_build_object('metadata', v_metadata)
  );

  return query select v_membership_id, v_is_active;
end;
$$;

commit;
