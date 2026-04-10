begin;

create or replace function public.app_update_rfq_with_line_items_tx(
  p_organization_id uuid,
  p_rfq_id uuid,
  p_status text,
  p_currency text,
  p_validity_date date,
  p_notes text,
  p_line_items jsonb
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

  return query
  select p_rfq_id, v_rfq.lead_id, coalesce(v_rfq.status, 'draft');
end;
$$;

commit;
