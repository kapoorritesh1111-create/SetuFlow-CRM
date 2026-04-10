begin;

create or replace function public.app_progress_contract_with_fanout_tx(
  p_organization_id uuid,
  p_contract_id uuid,
  p_actor_user_id uuid,
  p_next_status text,
  p_notes text default null,
  p_action_source text default 'progressContract'
)
returns table(
  contract_id uuid,
  lead_id uuid,
  quote_id uuid,
  current_status text,
  next_status text,
  subject text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract public.contracts%rowtype;
  v_now timestamptz := timezone('utc', now());
  v_next_status text := lower(trim(coalesce(p_next_status, '')));
  v_subject text;
  v_body text;
  v_previous jsonb;
  v_next jsonb;
begin
  select *
  into v_contract
  from public.contracts
  where id = p_contract_id
    and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'Contract % not found in the active organization', p_contract_id;
  end if;

  if v_next_status not in ('draft', 'signed', 'active', 'completed', 'cancelled') then
    raise exception 'Contract status % is invalid', p_next_status;
  end if;

  if not (
    (coalesce(v_contract.status, 'draft') = 'draft' and v_next_status in ('signed', 'cancelled')) or
    (coalesce(v_contract.status, 'draft') = 'signed' and v_next_status in ('active', 'cancelled')) or
    (coalesce(v_contract.status, 'draft') = 'active' and v_next_status in ('completed', 'cancelled')) or
    (coalesce(v_contract.status, 'draft') in ('completed', 'cancelled') and v_next_status = 'active')
  ) then
    raise exception 'Contract cannot move from % to %', coalesce(v_contract.status, 'draft'), v_next_status;
  end if;

  update public.contracts
  set status = v_next_status,
      updated_at = v_now,
      signed_at = case when v_next_status = 'signed' and signed_at is null then v_now else signed_at end,
      starts_on = case when v_next_status = 'active' and starts_on is null then v_now::date else starts_on end,
      ends_on = case when v_next_status = 'completed' and ends_on is null then v_now::date else ends_on end
  where id = p_contract_id
    and organization_id = p_organization_id;

  v_subject := case
    when v_next_status = 'signed' then 'Contract signed'
    when v_next_status = 'active' then case when coalesce(v_contract.status, 'draft') in ('cancelled', 'completed') then 'Contract reopened' else 'Contract activated' end
    when v_next_status = 'completed' then 'Contract completed'
    when v_next_status = 'cancelled' then 'Contract cancelled'
    else 'Contract updated'
  end;

  v_body := case
    when nullif(trim(coalesce(p_notes, '')), '') is not null then v_subject || '. Context: ' || trim(p_notes)
    else v_subject || '.'
  end;

  v_previous := jsonb_build_object('status', coalesce(v_contract.status, 'draft'));
  v_next := jsonb_build_object('status', v_next_status);

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
    p_organization_id,
    v_contract.lead_id,
    v_contract.quote_id,
    'contract',
    p_contract_id,
    'system_note',
    'internal',
    'system',
    v_subject,
    v_body,
    v_subject,
    'system',
    'sent',
    v_now,
    p_actor_user_id,
    '{}'::jsonb,
    jsonb_build_object('source', p_action_source, 'next_status', v_next_status)
  );

  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (
    p_organization_id,
    p_actor_user_id,
    'contract_progressed',
    'contract',
    p_contract_id,
    jsonb_build_object(
      'previous', v_previous,
      'new', v_next,
      'metadata', jsonb_build_object('source', p_action_source, 'note', nullif(trim(coalesce(p_notes, '')), ''))
    )
  );

  return query
  select p_contract_id, v_contract.lead_id, v_contract.quote_id, coalesce(v_contract.status, 'draft'), v_next_status, v_subject;
end;
$$;

commit;
