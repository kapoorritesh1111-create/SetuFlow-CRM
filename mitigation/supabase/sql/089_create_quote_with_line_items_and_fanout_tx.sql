begin;

create or replace function public.app_create_quote_with_line_items_and_fanout_tx(
  p_organization_id uuid,
  p_lead_id uuid,
  p_rfq_id uuid,
  p_created_by uuid,
  p_actor_name text,
  p_currency text,
  p_status text,
  p_notes text,
  p_line_items jsonb,
  p_plain_notes text default null,
  p_approval_required boolean default false,
  p_approval_state text default 'not_required',
  p_action_source text default 'createQuote'
)
returns table(
  quote_id uuid,
  lead_id uuid,
  contract_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote_id uuid;
  v_contract_id uuid;
  v_lead public.leads%rowtype;
  v_normalized_status text := lower(trim(coalesce(p_status, 'draft')));
  v_subject text;
  v_body text;
  v_event_type text;
  v_summary text;
  v_approval_subject text;
begin
  select *
  into v_lead
  from public.leads
  where public.leads.id = p_lead_id
    and public.leads.organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'Lead not found for quote creation in the active organization';
  end if;

  if p_line_items is null or jsonb_typeof(p_line_items) <> 'array' or jsonb_array_length(p_line_items) = 0 then
    raise exception 'Quote creation requires at least one line item';
  end if;

  insert into public.quotes (
    organization_id,
    lead_id,
    rfq_id,
    created_by,
    currency,
    status,
    notes
  )
  values (
    p_organization_id,
    p_lead_id,
    p_rfq_id,
    p_created_by,
    p_currency,
    p_status,
    p_notes
  )
  returning id into v_quote_id;

  insert into public.quote_line_items (
    quote_id,
    product_id,
    product_variant_id,
    catalog_price_id,
    catalog_price_amount,
    catalog_price_currency,
    quantity,
    unit_price,
    currency,
    is_price_overridden,
    override_reason,
    overridden_by,
    overridden_at,
    notes
  )
  select
    v_quote_id,
    nullif(item->>'product_id', '')::uuid,
    nullif(item->>'product_variant_id', '')::uuid,
    null::uuid,
    nullif(item->>'catalog_price_amount', '')::numeric,
    nullif(item->>'catalog_price_currency', ''),
    (item->>'quantity')::numeric,
    nullif(item->>'unit_price', '')::numeric,
    nullif(item->>'currency', ''),
    coalesce((item->>'is_price_overridden')::boolean, false),
    nullif(item->>'override_reason', ''),
    nullif(item->>'overridden_by', '')::uuid,
    nullif(item->>'overridden_at', '')::timestamptz,
    nullif(item->>'notes', '')
  from jsonb_array_elements(p_line_items) item;

  if v_normalized_status = 'accepted' then
    select contracts.id
    into v_contract_id
    from public.contracts
    where contracts.organization_id = p_organization_id
      and contracts.quote_id = v_quote_id
    limit 1;

    if v_contract_id is null then
      insert into public.contracts (
        organization_id,
        quote_id,
        lead_id,
        status,
        notes
      )
      values (
        p_organization_id,
        v_quote_id,
        p_lead_id,
        'draft',
        coalesce(nullif(trim(coalesce(p_plain_notes, '')), ''), 'Auto-created from accepted quote.')
      )
      returning id into v_contract_id;
    end if;

    perform public.app_sync_contract_from_quote_tx(p_organization_id, v_contract_id, v_quote_id, p_lead_id);
  end if;

  v_subject := case
    when v_normalized_status = 'sent' then 'Quote sent'
    when v_normalized_status = 'accepted' then 'Quote accepted'
    when v_normalized_status = 'rejected' then 'Quote rejected'
    when v_normalized_status = 'negotiating' then 'Quote moved to negotiation'
    else 'Quote draft created'
  end;

  v_summary := v_subject;

  v_body := case
    when v_normalized_status = 'sent' then format('Quote %s was sent in %s.', left(v_quote_id::text, 8), coalesce(p_currency, 'n/a'))
    when v_normalized_status = 'accepted' then format('Quote %s was created and marked accepted in %s.', left(v_quote_id::text, 8), coalesce(p_currency, 'n/a'))
    when v_normalized_status = 'rejected' then format('Quote %s was created and marked rejected in %s.', left(v_quote_id::text, 8), coalesce(p_currency, 'n/a'))
    when v_normalized_status = 'negotiating' then format('Quote %s entered negotiation in %s.', left(v_quote_id::text, 8), coalesce(p_currency, 'n/a'))
    else format('Quote %s was created in %s.', left(v_quote_id::text, 8), coalesce(p_currency, 'n/a'))
  end;

  if nullif(trim(coalesce(p_plain_notes, '')), '') is not null then
    v_body := v_body || ' Context: ' || trim(p_plain_notes);
  end if;

  v_event_type := case
    when v_normalized_status = 'sent' then 'sent'
    when v_normalized_status = 'negotiating' then 'counter_offer'
    when v_normalized_status = 'accepted' then 'accepted'
    when v_normalized_status = 'rejected' then 'rejected'
    when v_normalized_status = 'expired' then 'expired'
    when v_normalized_status in ('in_review', 'internal_review', 'approval_pending', 'pending_approval') then 'comment_added'
    when v_normalized_status = 'approved' then 'line_override_approved'
    else 'revision_created'
  end;

  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (
    p_organization_id,
    p_created_by,
    'quote_created',
    'quote',
    v_quote_id,
    jsonb_build_object(
      'previous', null,
      'new', jsonb_build_object('status', p_status, 'currency', p_currency),
      'metadata', jsonb_build_object(
        'lead_id', p_lead_id,
        'source', p_action_source,
        'approval_required', p_approval_required,
        'approval_state', p_approval_state
      )
    )
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
    p_organization_id,
    p_lead_id,
    v_quote_id,
    'quote',
    v_quote_id,
    case when v_normalized_status = 'sent' then 'quote_message' else 'system_note' end,
    case when v_normalized_status = 'sent' then 'outbound' else 'internal' end,
    'system',
    v_subject,
    v_body,
    v_summary,
    'system',
    case when v_normalized_status = 'sent' then 'sent' else 'approved' end,
    timezone('utc', now()),
    p_created_by,
    '{}'::jsonb,
    jsonb_build_object('source', p_action_source, 'status', v_normalized_status)
  );

  insert into public.quote_negotiation_events (
    quote_id,
    quote_version_id,
    event_type,
    actor_type,
    actor_user_id,
    actor_name,
    message,
    payload
  )
  values (
    v_quote_id,
    null,
    v_event_type,
    'internal_user',
    p_created_by,
    p_actor_name,
    v_body,
    jsonb_build_object('source', p_action_source, 'status', v_normalized_status)
  );

  if v_contract_id is not null then
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
      p_lead_id,
      v_quote_id,
      'quote',
      v_quote_id,
      'system_note',
      'internal',
      'system',
      'Contract entry created',
      format('Contract %s was created from accepted quote %s.', left(v_contract_id::text, 8), left(v_quote_id::text, 8)),
      'Contract entry created',
      'system',
      'approved',
      timezone('utc', now()),
      p_created_by,
      '{}'::jsonb,
      jsonb_build_object('source', p_action_source, 'contract_id', v_contract_id)
    );
  end if;

  if v_normalized_status = 'sent' then
    insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
    values (
      p_organization_id,
      p_created_by,
      'quote_sent',
      'quote',
      v_quote_id,
      jsonb_build_object(
        'previous', null,
        'new', jsonb_build_object('status', 'sent', 'currency', p_currency),
        'metadata', jsonb_build_object('lead_id', p_lead_id, 'source', p_action_source)
      )
    );
  end if;

  if p_approval_required and coalesce(p_approval_state, '') in ('pending', 'approved', 'rejected') then
    v_approval_subject := case
      when p_approval_state = 'approved' then 'Quote approval completed'
      when p_approval_state = 'rejected' then 'Quote approval rejected'
      else 'Quote approval pending'
    end;

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
      p_lead_id,
      v_quote_id,
      'quote',
      v_quote_id,
      'system_note',
      'internal',
      'system',
      v_approval_subject,
      case when nullif(trim(coalesce(p_plain_notes, '')), '') is not null then v_approval_subject || '. Context: ' || trim(p_plain_notes) else v_approval_subject || '.' end,
      v_approval_subject,
      'system',
      'approved',
      timezone('utc', now()),
      p_created_by,
      '{}'::jsonb,
      jsonb_build_object('source', p_action_source, 'approval_state', p_approval_state)
    );
  end if;

  return query
  select v_quote_id, p_lead_id, v_contract_id;
end;
$$;

commit;
