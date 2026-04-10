begin;

create or replace function public.app_refresh_lead_relations_tx(
  p_organization_id uuid,
  p_lead_id uuid,
  p_market_ids uuid[] default '{}',
  p_product_ids uuid[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market_count integer := coalesce(array_length(p_market_ids, 1), 0);
  v_product_count integer := coalesce(array_length(p_product_ids, 1), 0);
  v_valid_market_count integer := 0;
  v_valid_product_count integer := 0;
begin
  perform 1
  from public.leads
  where id = p_lead_id
    and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'Lead not found for the active organization';
  end if;

  if v_market_count > 0 then
    select count(*)
    into v_valid_market_count
    from public.markets
    where organization_id = p_organization_id
      and id = any(p_market_ids);

    if v_valid_market_count <> v_market_count then
      raise exception 'One or more selected markets are not available in the active organization';
    end if;
  end if;

  if v_product_count > 0 then
    select count(*)
    into v_valid_product_count
    from public.products
    where organization_id = p_organization_id
      and id = any(p_product_ids);

    if v_valid_product_count <> v_product_count then
      raise exception 'One or more selected products are not available in the active organization';
    end if;
  end if;

  delete from public.lead_markets
  where lead_id = p_lead_id;

  if v_market_count > 0 then
    insert into public.lead_markets (lead_id, market_id)
    select p_lead_id, distinct_market_id
    from (
      select distinct unnest(p_market_ids) as distinct_market_id
    ) deduped
    where distinct_market_id is not null;
  end if;

  delete from public.lead_product_interests
  where lead_id = p_lead_id;

  if v_product_count > 0 then
    insert into public.lead_product_interests (lead_id, product_id)
    select p_lead_id, distinct_product_id
    from (
      select distinct unnest(p_product_ids) as distinct_product_id
    ) deduped
    where distinct_product_id is not null;
  end if;
end;
$$;

commit;
