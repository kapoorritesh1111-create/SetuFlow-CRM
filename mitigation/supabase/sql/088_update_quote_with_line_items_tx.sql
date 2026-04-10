begin;

create or replace function public.app_update_quote_with_line_items_tx(
  p_organization_id uuid,
  p_quote_id uuid,
  p_status text,
  p_currency text,
  p_notes text,
  p_pricing_basis text,
  p_quote_version_id uuid,
  p_line_items jsonb
)
returns table(
  quote_id uuid,
  lead_id uuid,
  previous_status text,
  quote_version_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.quotes%rowtype;
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

  return query
  select p_quote_id, v_quote.lead_id, coalesce(v_quote.status, 'draft'), p_quote_version_id;
end;
$$;

commit;
