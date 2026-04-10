begin;

create or replace function public.app_ensure_contract_for_accepted_quote_tx(
  p_organization_id uuid,
  p_quote_id uuid,
  p_lead_id uuid,
  p_notes text default null
)
returns table(
  contract_id uuid,
  quote_id uuid,
  lead_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_contract_id uuid;
  v_quote public.quotes%rowtype;
  v_contract_id uuid;
begin
  select *
  into v_quote
  from public.quotes
  where public.quotes.id = p_quote_id
    and public.quotes.organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'Quote not found for accepted-quote contract creation in the active organization';
  end if;

  if v_quote.lead_id is distinct from p_lead_id then
    raise exception 'Accepted-quote contract creation lead mismatch';
  end if;

  select contracts.id
  into v_existing_contract_id
  from public.contracts
  where contracts.organization_id = p_organization_id
    and contracts.quote_id = p_quote_id
  limit 1;

  if v_existing_contract_id is not null then
    return query
    select v_existing_contract_id, p_quote_id, p_lead_id;
    return;
  end if;

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
    p_lead_id,
    'draft',
    p_notes
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

  return query
  select v_contract_id, p_quote_id, p_lead_id;
end;
$$;

commit;
