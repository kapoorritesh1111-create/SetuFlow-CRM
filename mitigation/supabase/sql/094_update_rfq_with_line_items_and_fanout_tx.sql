begin;

create or replace function public.app_update_rfq_with_line_items_and_fanout_tx(
  p_organization_id uuid,
  p_rfq_id uuid,
  p_actor_user_id uuid,
  p_status text,
  p_currency text,
  p_validity_date date,
  p_notes text,
  p_line_items jsonb,
  p_request_summary text,
  p_supplier_response_count integer default 0,
  p_action_source text default 'updateRfqWorkflow'
)
returns table(
  rfq_id uuid,
  lead_id uuid,
  previous_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rfq public.rfqs%rowtype;
  v_subject text;
  v_body text;
  v_normalized_status text := lower(trim(coalesce(p_status, 'draft')));
begin
  select *
  into v_rfq
  from public.rfqs
  where public.rfqs.id = p_rfq_id
    and public.rfqs.organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'RFQ not found for update in the active organization';
  end if;

  if p_line_items is null or jsonb_typeof(p_line_items) <> 'array' or jsonb_array_length(p_line_items) = 0 then
    raise exception 'RFQ update requires at least one line item';
  end if;

  update public.rfqs
  set
    status = p_status,
    currency = p_currency,
    validity_date = p_validity_date,
    notes = p_notes,
    updated_at = timezone('utc', now())
  where public.rfqs.id = p_rfq_id
    and public.rfqs.organization_id = p_organization_id;

  delete from public.rfq_line_items
  where public.rfq_line_items.rfq_id = p_rfq_id;

  insert into public.rfq_line_items (
    rfq_id,
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
    p_rfq_id,
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

  v_subject := case
    when v_normalized_status = 'sent_to_suppliers' then 'RFQ sent to suppliers'
    when v_normalized_status = 'supplier_responses_received' then 'Supplier responses received'
    when v_normalized_status = 'submitted' then 'RFQ submitted'
    when v_normalized_status = 'closed' then 'RFQ closed'
    else 'RFQ workflow updated'
  end;
  v_body := v_subject || '. Request: ' || coalesce(p_request_summary, '') || '.';

  insert into public.communications (
    organization_id,
    lead_id,
    rfq_id,
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
    v_rfq.lead_id,
    p_rfq_id,
    'rfq',
    p_rfq_id,
    'system_note',
    case when v_normalized_status in ('sent_to_suppliers', 'supplier_responses_received') then 'outbound' else 'internal' end,
    'system',
    v_subject,
    v_body,
    v_subject,
    'system',
    case when v_normalized_status = 'sent_to_suppliers' then 'sent' else 'approved' end,
    timezone('utc', now()),
    p_actor_user_id,
    '{}'::jsonb,
    jsonb_build_object('source', p_action_source, 'status', v_normalized_status, 'supplierResponseCount', p_supplier_response_count)
  );

  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (
    p_organization_id,
    p_actor_user_id,
    'rfq_updated',
    'rfq',
    p_rfq_id,
    jsonb_build_object(
      'previous', jsonb_build_object('status', v_rfq.status, 'currency', v_rfq.currency, 'validity_date', v_rfq.validity_date),
      'new', jsonb_build_object('status', v_normalized_status, 'currency', p_currency, 'validity_date', p_validity_date),
      'metadata', jsonb_build_object(
        'lead_id', v_rfq.lead_id,
        'supplier_response_count', p_supplier_response_count,
        'line_item_count', jsonb_array_length(p_line_items),
        'request_summary', p_request_summary,
        'source', p_action_source
      )
    )
  );

  if lower(trim(coalesce(v_rfq.status, 'draft'))) <> v_normalized_status then
    insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
    values (
      p_organization_id,
      p_actor_user_id,
      'rfq_status_changed',
      'rfq',
      p_rfq_id,
      jsonb_build_object(
        'previous', jsonb_build_object('status', v_rfq.status),
        'new', jsonb_build_object('status', v_normalized_status),
        'metadata', jsonb_build_object('lead_id', v_rfq.lead_id, 'supplier_response_count', p_supplier_response_count, 'source', p_action_source)
      )
    );
  end if;

  return query select p_rfq_id, v_rfq.lead_id, coalesce(v_rfq.status, 'draft');
end;
$$;

commit;
