begin;

create or replace function public.app_update_quote_with_line_items_and_fanout_tx(
  p_organization_id uuid,
  p_quote_id uuid,
  p_actor_user_id uuid,
  p_actor_name text,
  p_status text,
  p_currency text,
  p_notes text,
  p_pricing_basis text,
  p_quote_version_id uuid,
  p_line_items jsonb,
  p_plain_notes text default null,
  p_approval_required boolean default false,
  p_approval_state text default 'not_required',
  p_action_source text default 'updateQuoteWorkflow'
)
returns table(
  quote_id uuid,
  lead_id uuid,
  previous_status text,
  quote_version_id uuid,
  contract_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.quotes%rowtype;
  v_contract_id uuid;
  v_normalized_status text := lower(trim(coalesce(p_status, 'draft')));
  v_subject text;
  v_body text;
  v_event_type text;
  v_approval_subject text;
begin
  select *
  into v_quote
  from public.quotes
  where public.quotes.id = p_quote_id
    and public.quotes.organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'Quote not found for update in the active organization';
  end if;

  if p_line_items is null or jsonb_typeof(p_line_items) <> 'array' or jsonb_array_length(p_line_items) = 0 then
    raise exception 'Quote update requires at least one line item';
  end if;

  update public.quotes
  set
    status = p_status,
    currency = p_currency,
    notes = p_notes,
    updated_at = timezone('utc', now())
  where public.quotes.id = p_quote_id
    and public.quotes.organization_id = p_organization_id;

  if p_quote_version_id is not null then
    update public.quote_versions
    set
      pricing_basis = p_pricing_basis,
      display_currency = p_currency,
      updated_at = timezone('utc', now())
    where public.quote_versions.id = p_quote_version_id;
  end if;

  delete from public.quote_line_items
  where public.quote_line_items.quote_id = p_quote_id;

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
    p_quote_id,
    nullif(item->>'product_id', '')::uuid,
    nullif(item->>'product_variant_id', '')::uuid,
    nullif(item->>'catalog_price_id', '')::uuid,
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
      and contracts.quote_id = p_quote_id
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
        p_quote_id,
        v_quote.lead_id,
        'draft',
        coalesce(nullif(trim(coalesce(p_plain_notes, '')), ''), 'Auto-created from accepted quote.')
      )
      returning id into v_contract_id;

      insert into public.contract_line_items (
        contract_id,
        product_id,
        product_variant_id,
        quantity,
        unit_price,
        currency,
        notes,
        catalog_price_id,
        catalog_price_amount,
        catalog_price_currency,
        is_price_overridden,
        override_reason,
        overridden_by,
        overridden_at
      )
      select
        v_contract_id,
        quote_line_items.product_id,
        quote_line_items.product_variant_id,
        coalesce(quote_line_items.quantity, 1),
        quote_line_items.unit_price,
        quote_line_items.currency,
        quote_line_items.notes,
        null::uuid,
        quote_line_items.catalog_price_amount,
        quote_line_items.catalog_price_currency,
        coalesce(quote_line_items.is_price_overridden, false),
        quote_line_items.override_reason,
        quote_line_items.overridden_by,
        quote_line_items.overridden_at
      from public.quote_line_items
      where quote_line_items.quote_id = p_quote_id;
    end if;
  end if;

  v_subject := case
    when v_normalized_status = 'sent' then 'Quote sent'
    when v_normalized_status = 'accepted' then 'Quote accepted'
    when v_normalized_status = 'rejected' then 'Quote rejected'
    when v_normalized_status = 'negotiating' then 'Quote moved to negotiation'
    when v_normalized_status in ('in_review', 'internal_review') then 'Quote moved to internal review'
    when v_normalized_status = 'expired' then 'Quote expired'
    when v_normalized_status = 'cancelled' then 'Quote cancelled'
    else 'Quote workflow updated'
  end;

  v_body := case
    when v_normalized_status = 'sent' then format('Quote %s was sent in %s.', left(p_quote_id::text, 8), coalesce(p_currency, 'n/a'))
    when v_normalized_status = 'accepted' then format('Quote %s was marked accepted in %s.', left(p_quote_id::text, 8), coalesce(p_currency, 'n/a'))
    when v_normalized_status = 'rejected' then format('Quote %s was marked rejected in %s.', left(p_quote_id::text, 8), coalesce(p_currency, 'n/a'))
    when v_normalized_status = 'negotiating' then format('Quote %s moved into negotiation in %s.', left(p_quote_id::text, 8), coalesce(p_currency, 'n/a'))
    when v_normalized_status in ('in_review', 'internal_review') then format('Quote %s moved to internal review in %s.', left(p_quote_id::text, 8), coalesce(p_currency, 'n/a'))
    when v_normalized_status = 'expired' then format('Quote %s expired in %s.', left(p_quote_id::text, 8), coalesce(p_currency, 'n/a'))
    when v_normalized_status = 'cancelled' then format('Quote %s was cancelled in %s.', left(p_quote_id::text, 8), coalesce(p_currency, 'n/a'))
    else format('Quote %s workflow was updated in %s.', left(p_quote_id::text, 8), coalesce(p_currency, 'n/a'))
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
    p_actor_user_id,
    'quote_updated',
    'quote',
    p_quote_id,
    jsonb_build_object(
      'previous', jsonb_build_object('status', coalesce(v_quote.status, null)),
      'new', jsonb_build_object('status', v_normalized_status, 'currency', p_currency),
      'metadata', jsonb_build_object('lead_id', v_quote.lead_id, 'source', p_action_source)
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
    v_quote.lead_id,
    p_quote_id,
    'quote',
    p_quote_id,
    case when v_normalized_status = 'sent' then 'quote_message' else 'system_note' end,
    case when v_normalized_status = 'sent' then 'outbound' else 'internal' end,
    'system',
    v_subject,
    v_body,
    v_subject,
    'system',
    case when v_normalized_status = 'sent' then 'sent' else 'approved' end,
    timezone('utc', now()),
    p_actor_user_id,
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
    p_quote_id,
    p_quote_version_id,
    v_event_type,
    'internal_user',
    p_actor_user_id,
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
      v_quote.lead_id,
      p_quote_id,
      'quote',
      p_quote_id,
      'system_note',
      'internal',
      'system',
      'Contract entry created',
      format('Contract %s was created from accepted quote %s.', left(v_contract_id::text, 8), left(p_quote_id::text, 8)),
      'Contract entry created',
      'system',
      'approved',
      timezone('utc', now()),
      p_actor_user_id,
      '{}'::jsonb,
      jsonb_build_object('source', p_action_source, 'contract_id', v_contract_id)
    );
  end if;

  if v_normalized_status = 'sent' then
    insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
    values (
      p_organization_id,
      p_actor_user_id,
      'quote_sent',
      'quote',
      p_quote_id,
      jsonb_build_object(
        'previous', jsonb_build_object('status', coalesce(v_quote.status, null)),
        'new', jsonb_build_object('status', 'sent', 'currency', p_currency),
        'metadata', jsonb_build_object('lead_id', v_quote.lead_id, 'source', p_action_source)
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
      v_quote.lead_id,
      p_quote_id,
      'quote',
      p_quote_id,
      'system_note',
      'internal',
      'system',
      v_approval_subject,
      case when nullif(trim(coalesce(p_plain_notes, '')), '') is not null then v_approval_subject || '. Context: ' || trim(p_plain_notes) else v_approval_subject || '.' end,
      v_approval_subject,
      'system',
      'approved',
      timezone('utc', now()),
      p_actor_user_id,
      '{}'::jsonb,
      jsonb_build_object('source', p_action_source, 'approval_state', p_approval_state)
    );
  end if;

  return query
  select p_quote_id, v_quote.lead_id, coalesce(v_quote.status, 'draft'), p_quote_version_id, v_contract_id;
end;
$$;

commit;
