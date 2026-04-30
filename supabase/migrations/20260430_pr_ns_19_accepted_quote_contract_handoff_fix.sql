-- PR-NS-19 — accepted quote -> contract/order handoff continuity fix
-- Purpose:
-- 1) Patch app_ensure_contract_for_accepted_quote_tx so accepted quote handoff can create
--    contract_line_items on schemas where contract_line_items.organization_id is NOT NULL.
-- 2) Preserve accepted version continuity on the created contract.
-- 3) Repair the PR-NS-19 golden contract row if this migration is replayed after the live run.

create or replace function public.app_ensure_contract_for_accepted_quote_tx(
  p_organization_id uuid,
  p_quote_id uuid,
  p_lead_id uuid,
  p_notes text default null::text
)
returns table(contract_id uuid, quote_id uuid, lead_id uuid)
language plpgsql
security definer
set search_path to 'public'
as $function$
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
    update public.contracts
    set accepted_quote_version_id = coalesce(accepted_quote_version_id, v_quote.accepted_version_id, v_quote.current_version_id),
        commercial_lock_state = coalesce(commercial_lock_state, 'accepted_locked'),
        accepted_at = coalesce(accepted_at, timezone('utc', now())),
        commercial_handoff_at = coalesce(commercial_handoff_at, timezone('utc', now())),
        updated_at = timezone('utc', now())
    where id = v_existing_contract_id;

    return query
    select v_existing_contract_id, p_quote_id, p_lead_id;
    return;
  end if;

  insert into public.contracts (
    organization_id,
    quote_id,
    lead_id,
    status,
    notes,
    accepted_quote_version_id,
    commercial_lock_state,
    accepted_at,
    commercial_handoff_at
  ) values (
    p_organization_id,
    p_quote_id,
    p_lead_id,
    'draft',
    p_notes,
    coalesce(v_quote.accepted_version_id, v_quote.current_version_id),
    'accepted_locked',
    timezone('utc', now()),
    timezone('utc', now())
  ) returning id into v_contract_id;

  insert into public.contract_line_items (
    organization_id,
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
    overridden_at,
    source_quote_line_item_id
  )
  select
    p_organization_id,
    v_contract_id,
    quote_line_items.product_id,
    quote_line_items.product_variant_id,
    coalesce(quote_line_items.quantity, 1),
    quote_line_items.unit_price,
    quote_line_items.currency,
    quote_line_items.notes,
    quote_line_items.catalog_price_id,
    quote_line_items.catalog_price_amount,
    quote_line_items.catalog_price_currency,
    coalesce(quote_line_items.is_price_overridden, false),
    quote_line_items.override_reason,
    quote_line_items.overridden_by,
    quote_line_items.overridden_at,
    quote_line_items.id
  from public.quote_line_items
  where quote_line_items.quote_id = p_quote_id;

  return query
  select v_contract_id, p_quote_id, p_lead_id;
end;
$function$;

-- Idempotent repair for the PR-NS-19 live golden acceptance proof if needed.
update public.contracts
set accepted_quote_version_id = coalesce(accepted_quote_version_id, '7f8efd6b-6e19-4941-b974-a5fc61738b0f'::uuid),
    commercial_lock_state = coalesce(commercial_lock_state, 'accepted_locked'),
    accepted_at = coalesce(accepted_at, timezone('utc', now())),
    commercial_handoff_at = coalesce(commercial_handoff_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
where quote_id = 'b6f8111a-3b32-456d-92f0-412c898bf13b'::uuid;
