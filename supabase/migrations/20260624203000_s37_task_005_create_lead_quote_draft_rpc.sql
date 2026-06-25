create or replace function public.app_create_lead_quote_draft_tx(
  p_organization_id uuid,
  p_lead_id uuid,
  p_actor_user_id uuid,
  p_idempotency_key text default null
)
returns table(
  quote_id uuid,
  quote_version_id uuid,
  line_count integer,
  created boolean
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_lead record;
  v_existing_quote record;
  v_quote_id uuid;
  v_quote_version_id uuid;
  v_line_count integer := 0;
  v_request_key text;
  v_currency text := 'USD';
  v_pricing_basis text := 'fob';
  v_is_disqualified boolean := false;
begin
  if p_organization_id is null or p_lead_id is null or p_actor_user_id is null then
    raise exception using message = 'organization_id, lead_id, and actor_user_id are required', errcode = '22023';
  end if;

  if not public.is_org_member(p_organization_id) then
    raise exception using message = 'User is not a member of this organization', errcode = '42501';
  end if;

  select l.* into v_lead
  from public.leads l
  where l.id = p_lead_id
    and l.organization_id = p_organization_id
  for update;

  if not found then
    raise exception using message = 'Lead not found in this organization', errcode = 'P0002';
  end if;

  v_is_disqualified :=
    lower(coalesce(v_lead.notes, '')) like '%"status":"disqualified"%'
    or lower(coalesce(v_lead.notes, '')) like '%disqualified%';

  if v_is_disqualified then
    raise exception using message = 'Lead is disqualified and cannot create a quote', errcode = 'P0001';
  end if;

  if coalesce(btrim(v_lead.company_name), '') = '' then
    raise exception using message = 'Lead company name is required before creating a quote', errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.lead_product_interests lpi
    join public.products p on p.id = lpi.product_id
    where lpi.lead_id = p_lead_id
      and lpi.organization_id = p_organization_id
      and p.organization_id = p_organization_id
      and p.is_active = true
      and lpi.product_id is not null
  ) then
    raise exception using message = 'Lead needs at least one active product interest before creating a quote', errcode = 'P0001';
  end if;

  v_request_key := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  if v_request_key is null then
    v_request_key := 'lead-quote-draft:' || p_organization_id::text || ':' || p_lead_id::text;
  end if;

  select q.id, q.current_version_id into v_existing_quote
  from public.quotes q
  where q.organization_id = p_organization_id
    and q.quote_creation_request_key = v_request_key
  limit 1;

  if v_existing_quote.id is not null then
    quote_id := v_existing_quote.id;
    quote_version_id := v_existing_quote.current_version_id;
    select count(*)::integer into line_count
    from public.quote_version_line_items qvli
    where qvli.quote_version_id = v_existing_quote.current_version_id;
    created := false;
    return next;
    return;
  end if;

  v_currency := coalesce(nullif(v_lead.deal_currency, ''), 'USD');

  insert into public.quotes (
    organization_id,
    lead_id,
    created_by,
    currency,
    display_currency,
    pricing_basis,
    notes,
    source_type,
    quote_creation_request_key
  ) values (
    p_organization_id,
    p_lead_id,
    p_actor_user_id,
    v_currency,
    v_currency,
    v_pricing_basis,
    'Created from lead detail.',
    'lead',
    v_request_key
  )
  returning id into v_quote_id;

  insert into public.quote_versions (
    quote_id,
    version_no,
    status,
    pricing_basis,
    display_currency,
    internal_notes,
    total_line_count,
    created_by
  ) values (
    v_quote_id,
    1,
    'draft',
    v_pricing_basis,
    v_currency,
    'Draft created from lead product interests.',
    0,
    p_actor_user_id
  )
  returning id into v_quote_version_id;

  insert into public.quote_line_items (
    quote_id,
    product_id,
    quantity,
    unit_price,
    currency,
    notes,
    product_variant_id,
    catalog_price_amount,
    catalog_price_currency,
    is_price_overridden
  )
  select
    v_quote_id,
    p.id,
    1,
    coalesce(p.fob_price, p.exw_price, p.cif_price, p.base_cost, 0),
    coalesce(p.pricing_currency, v_currency),
    p.name,
    null::uuid,
    coalesce(p.fob_price, p.exw_price, p.cif_price, p.base_cost, 0),
    coalesce(p.pricing_currency, v_currency),
    false
  from public.lead_product_interests lpi
  join public.products p on p.id = lpi.product_id
  where lpi.lead_id = p_lead_id
    and lpi.organization_id = p_organization_id
    and p.organization_id = p_organization_id
    and p.is_active = true
    and lpi.product_id is not null
  order by lpi.created_at asc, p.sort_order asc, p.name asc;

  insert into public.quote_version_line_items (
    quote_version_id,
    product_id,
    product_variant_id,
    sku_code,
    hsn_code,
    product_name,
    category_type,
    pack_label,
    basis_applied,
    pricing_mode,
    moq,
    source_ex_factory_usd,
    source_fob_usd,
    source_bulk_usd_per_kg,
    final_unit_price,
    display_currency,
    is_overridden,
    line_notes,
    sort_order,
    calculation_meta,
    catalog_price_snapshot
  )
  select
    v_quote_version_id,
    p.id,
    null::uuid,
    coalesce(nullif(p.sku_code, ''), nullif(p.sku, ''), 'PRODUCT-' || row_number() over (order by lpi.created_at asc, p.sort_order asc, p.name asc)::text),
    p.hsn_code,
    p.name,
    coalesce(pc.name, ''),
    p.pack_size,
    v_pricing_basis,
    'case',
    1,
    p.exw_price,
    p.fob_price,
    null::numeric,
    coalesce(p.fob_price, p.exw_price, p.cif_price, p.base_cost, 0),
    coalesce(p.pricing_currency, v_currency),
    false,
    'Seeded from lead product interest.',
    row_number() over (order by lpi.created_at asc, p.sort_order asc, p.name asc)::integer - 1,
    jsonb_build_object('source', 'app_create_lead_quote_draft_tx', 'lead_product_interest_id', lpi.id),
    jsonb_build_object(
      'product_id', p.id,
      'sku_code', p.sku_code,
      'pricing_currency', p.pricing_currency,
      'fob_price', p.fob_price,
      'exw_price', p.exw_price,
      'cif_price', p.cif_price,
      'base_cost', p.base_cost
    )
  from public.lead_product_interests lpi
  join public.products p on p.id = lpi.product_id
  left join public.product_categories pc on pc.id = p.category_id
  where lpi.lead_id = p_lead_id
    and lpi.organization_id = p_organization_id
    and p.organization_id = p_organization_id
    and p.is_active = true
    and lpi.product_id is not null
  order by lpi.created_at asc, p.sort_order asc, p.name asc;

  get diagnostics v_line_count = row_count;

  update public.quote_versions
  set total_line_count = v_line_count
  where id = v_quote_version_id;

  insert into public.lead_activities (
    organization_id,
    lead_id,
    actor_user_id,
    kind,
    message
  ) values (
    p_organization_id,
    p_lead_id,
    p_actor_user_id,
    'quote_created',
    'Quote draft created from lead product interests.'
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
    created_by,
    metadata
  ) values (
    p_organization_id,
    p_lead_id,
    v_quote_id,
    'quote',
    v_quote_id,
    'system_note',
    'internal',
    'system',
    'Quote draft created',
    'A quote draft was created from lead product interests.',
    'Quote draft created from lead product interests.',
    'system',
    'sent',
    p_actor_user_id,
    jsonb_build_object('source', 'app_create_lead_quote_draft_tx', 'quote_version_id', v_quote_version_id)
  );

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    entity_type,
    entity_id,
    action,
    payload
  ) values (
    p_organization_id,
    p_actor_user_id,
    'quote',
    v_quote_id,
    'quote_created',
    jsonb_build_object(
      'source', 'app_create_lead_quote_draft_tx',
      'lead_id', p_lead_id,
      'quote_version_id', v_quote_version_id,
      'line_count', v_line_count,
      'idempotency_key', v_request_key
    )
  );

  quote_id := v_quote_id;
  quote_version_id := v_quote_version_id;
  line_count := v_line_count;
  created := true;
  return next;
end;
$function$;

grant execute on function public.app_create_lead_quote_draft_tx(uuid, uuid, uuid, text) to authenticated;
