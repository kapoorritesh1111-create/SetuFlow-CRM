begin;

create or replace function public.app_create_rfq_with_line_items_and_fanout_tx(
  p_organization_id uuid,
  p_lead_id uuid,
  p_created_by uuid,
  p_status text,
  p_currency text,
  p_validity_date date,
  p_notes text,
  p_line_items jsonb,
  p_request_summary text,
  p_supplier_response_count integer default 0,
  p_action_source text default 'createRfq'
)
returns table(
  rfq_id uuid,
  lead_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rfq_id uuid;
  v_lead public.leads%rowtype;
  v_subject text;
  v_body text;
  v_normalized_status text := lower(trim(coalesce(p_status, 'draft')));
begin
  select *
  into v_lead
  from public.leads
  where public.leads.id = p_lead_id
    and public.leads.organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'Lead not found for RFQ creation in the active organization';
  end if;

  if p_line_items is null or jsonb_typeof(p_line_items) <> 'array' or jsonb_array_length(p_line_items) = 0 then
    raise exception 'RFQ creation requires at least one line item';
  end if;

  insert into public.rfqs (
    organization_id,
    lead_id,
    status,
    currency,
    validity_date,
    notes,
    created_by
  )
  values (
    p_organization_id,
    p_lead_id,
    p_status,
    p_currency,
    p_validity_date,
    p_notes,
    p_created_by
  )
  returning id into v_rfq_id;

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
    v_rfq_id,
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
    when v_normalized_status = 'submitted' then 'RFQ submitted'
    else 'RFQ created'
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
    p_lead_id,
    v_rfq_id,
    'rfq',
    v_rfq_id,
    'system_note',
    case when v_normalized_status = 'sent_to_suppliers' then 'outbound' else 'internal' end,
    'system',
    v_subject,
    v_body,
    v_subject,
    'system',
    case when v_normalized_status = 'sent_to_suppliers' then 'sent' else 'approved' end,
    timezone('utc', now()),
    p_created_by,
    '{}'::jsonb,
    jsonb_build_object('source', p_action_source, 'status', v_normalized_status, 'supplierResponseCount', p_supplier_response_count)
  );

  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (
    p_organization_id,
    p_created_by,
    'rfq_created',
    'rfq',
    v_rfq_id,
    jsonb_build_object(
      'previous', null,
      'new', jsonb_build_object('status', p_status, 'currency', p_currency, 'validity_date', p_validity_date),
      'metadata', jsonb_build_object(
        'lead_id', p_lead_id,
        'supplier_response_count', p_supplier_response_count,
        'line_item_count', jsonb_array_length(p_line_items),
        'request_summary', p_request_summary,
        'source', p_action_source
      )
    )
  );

  return query select v_rfq_id, p_lead_id;
end;
$$;

commit;
