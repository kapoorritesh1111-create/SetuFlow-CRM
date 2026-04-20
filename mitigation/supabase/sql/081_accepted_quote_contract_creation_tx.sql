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
    perform public.app_sync_contract_from_quote_tx(p_organization_id, v_existing_contract_id, p_quote_id, p_lead_id);
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

  perform public.app_sync_contract_from_quote_tx(p_organization_id, v_contract_id, p_quote_id, p_lead_id);

  return query
  select v_contract_id, p_quote_id, p_lead_id;
end;
$$;

commit;
