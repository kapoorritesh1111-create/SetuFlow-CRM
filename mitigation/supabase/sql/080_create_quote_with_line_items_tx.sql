begin;

create or replace function public.app_create_quote_with_line_items_tx(
  p_organization_id uuid,
  p_lead_id uuid,
  p_rfq_id uuid,
  p_created_by uuid,
  p_currency text,
  p_status text,
  p_notes text,
  p_line_items jsonb
)
returns table(
  quote_id uuid,
  lead_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote_id uuid;
  v_lead public.leads%rowtype;
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

  return query
  select v_quote_id, p_lead_id;
end;
$$;

commit;
