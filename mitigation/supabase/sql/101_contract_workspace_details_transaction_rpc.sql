begin;

create or replace function public.app_update_contract_workspace_details_tx(
  p_payload jsonb
)
returns table(
  contract_id uuid,
  lead_id uuid,
  quote_id uuid,
  subject text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid := nullif(trim(coalesce(p_payload->>'organization_id', '')), '')::uuid;
  v_contract_id uuid := nullif(trim(coalesce(p_payload->>'contract_id', '')), '')::uuid;
  v_actor_user_id uuid := nullif(trim(coalesce(p_payload->>'actor_user_id', '')), '')::uuid;
  v_action_source text := coalesce(nullif(trim(coalesce(p_payload->>'action_source', '')), ''), 'updateContractWorkspaceDetails');
  v_contract public.contracts%rowtype;
  v_now timestamptz := timezone('utc', now());
  v_starts_on date := case when nullif(trim(coalesce(p_payload->>'starts_on', '')), '') is not null then (p_payload->>'starts_on')::date else null end;
  v_ends_on date := case when nullif(trim(coalesce(p_payload->>'ends_on', '')), '') is not null then (p_payload->>'ends_on')::date else null end;
  v_notes text := nullif(trim(coalesce(p_payload->>'notes', '')), '');
  v_subject text := 'Contract workspace updated';
  v_body text;
  v_previous jsonb;
  v_next jsonb;
  v_detail_parts text[] := array[]::text[];
  v_effective_starts_on date;
  v_effective_ends_on date;
  v_effective_notes text;
begin
  if v_organization_id is null then
    raise exception 'Organization is required.';
  end if;

  if v_contract_id is null then
    raise exception 'Contract is required.';
  end if;

  select *
  into v_contract
  from public.contracts
  where id = v_contract_id
    and organization_id = v_organization_id
  for update;

  if not found then
    raise exception 'Contract % not found in the active organization.', v_contract_id;
  end if;

  v_effective_starts_on := coalesce(v_starts_on, v_contract.starts_on);
  v_effective_ends_on := coalesce(v_ends_on, v_contract.ends_on);
  v_effective_notes := coalesce(v_notes, v_contract.notes);

  update public.contracts
  set starts_on = v_effective_starts_on,
      ends_on = v_effective_ends_on,
      notes = v_effective_notes,
      updated_at = v_now
  where id = v_contract_id
    and organization_id = v_organization_id;

  if v_starts_on is not null and v_starts_on is distinct from v_contract.starts_on then
    v_detail_parts := array_append(v_detail_parts, format('start date %s', v_starts_on));
  end if;

  if v_ends_on is not null and v_ends_on is distinct from v_contract.ends_on then
    v_detail_parts := array_append(v_detail_parts, format('end date %s', v_ends_on));
  end if;

  if v_notes is not null and v_notes is distinct from coalesce(v_contract.notes, '') then
    v_detail_parts := array_append(v_detail_parts, 'workspace notes updated');
  end if;

  v_body := case
    when array_length(v_detail_parts, 1) is not null then v_subject || ': ' || array_to_string(v_detail_parts, ', ') || '.'
    else v_subject || '.'
  end;

  v_previous := jsonb_build_object(
    'starts_on', v_contract.starts_on,
    'ends_on', v_contract.ends_on,
    'notes', v_contract.notes
  );
  v_next := jsonb_build_object(
    'starts_on', v_effective_starts_on,
    'ends_on', v_effective_ends_on,
    'notes', v_effective_notes
  );

  insert into public.communications (
    organization_id,
    lead_id,
    quote_id,
    related_entity,
    related_id,
    communication_type,
    direction,
    channel,
    subject,
    body,
    summary,
    draft_source,
    status,
    sent_at,
    created_by,
    provider_payload,
    metadata
  )
  values (
    v_organization_id,
    v_contract.lead_id,
    v_contract.quote_id,
    'contract',
    v_contract_id,
    'system_note',
    'internal',
    'system',
    v_subject,
    v_body,
    v_subject,
    'system',
    'sent',
    v_now,
    v_actor_user_id,
    '{}'::jsonb,
    jsonb_strip_nulls(
      jsonb_build_object(
        'source', v_action_source,
        'starts_on', v_starts_on,
        'ends_on', v_ends_on
      )
    )
  );

  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (
    v_organization_id,
    v_actor_user_id,
    'contract_updated',
    'contract',
    v_contract_id,
    jsonb_build_object(
      'previous', v_previous,
      'new', v_next,
      'metadata', jsonb_build_object('source', v_action_source)
    )
  );

  return query
  select v_contract_id, v_contract.lead_id, v_contract.quote_id, v_subject;
end;
$$;

commit;
