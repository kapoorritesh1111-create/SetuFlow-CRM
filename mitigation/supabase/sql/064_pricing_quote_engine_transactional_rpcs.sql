-- 064_pricing_quote_engine_transactional_rpcs.sql
-- Purpose: wrap draft-version creation and send lifecycle in database transactions
-- so version, snapshot, line items, and parent quote state change atomically.

begin;

create or replace function public.app_create_draft_quote_version_from_compile_tx(p_payload jsonb)
returns table(id uuid, quote_id uuid, version_no integer, status text)
language plpgsql
as $$
declare
  v_quote_id uuid := (p_payload->'compiled'->>'quoteId')::uuid;
  v_actor_user_id uuid := (p_payload->>'actorUserId')::uuid;
  v_valid_until date := nullif(p_payload->>'validUntil', '')::date;
  v_customer_message text := nullif(p_payload->>'customerMessage', '');
  v_internal_notes text := nullif(p_payload->>'internalNotes', '');
  v_pricing_basis text := p_payload->'compiled'->>'pricingBasis';
  v_display_currency text := p_payload->'compiled'->>'displayCurrency';
  v_total_line_count integer := coalesce((p_payload->'compiled'->>'totalLineCount')::integer, 0);
  v_next_version_no integer;
  v_created_id uuid;
begin
  if v_quote_id is null then
    raise exception 'Compiled quote payload is missing quoteId';
  end if;

  select coalesce(max(qv.version_no), 0) + 1
  into v_next_version_no
  from public.quote_versions qv
  where qv.quote_id = v_quote_id;

  insert into public.quote_versions (
    quote_id,
    version_no,
    status,
    pricing_basis,
    display_currency,
    valid_until,
    customer_message,
    internal_notes,
    total_line_count,
    created_by
  )
  values (
    v_quote_id,
    v_next_version_no,
    'draft',
    v_pricing_basis,
    v_display_currency,
    v_valid_until,
    v_customer_message,
    v_internal_notes,
    v_total_line_count,
    v_actor_user_id
  )
  returning quote_versions.id into v_created_id;

  insert into public.quote_pricing_snapshots (
    quote_version_id,
    pricing_rule_set_id,
    freight_profile_id,
    fx_base_currency,
    fx_display_currency,
    fx_rate,
    fx_provider,
    fx_effective_at,
    quote_context,
    freight_context,
    calculation_payload,
    source_hash
  )
  values (
    v_created_id,
    (p_payload->'compiled'->>'pricingRuleSetId')::uuid,
    nullif(p_payload->'compiled'->>'freightProfileId', '')::uuid,
    coalesce(p_payload->'compiled'->'fx'->>'baseCurrency', 'USD'),
    p_payload->'compiled'->'fx'->>'displayCurrency',
    nullif(p_payload->'compiled'->'fx'->>'rate', '')::numeric,
    p_payload->'compiled'->'fx'->>'provider',
    nullif(p_payload->'compiled'->'fx'->>'effectiveAt', '')::timestamptz,
    coalesce(p_payload->'compiled'->'quoteContext', '{}'::jsonb),
    coalesce(p_payload->'compiled'->'freight'->'freightContext', '{}'::jsonb),
    coalesce(p_payload->'compiled'->'calculationPayload', '{}'::jsonb),
    p_payload->'compiled'->>'sourceHash'
  );

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
    units_per_case,
    moq,
    source_ex_factory_usd,
    source_fob_usd,
    source_bulk_usd_per_kg,
    source_ex_factory_inr,
    source_fob_inr,
    source_bulk_inr_per_kg,
    freight_add_on_usd,
    fx_rate,
    final_unit_price,
    final_case_price,
    final_kg_price,
    display_currency,
    is_overridden,
    override_reason,
    line_notes,
    sort_order,
    calculation_meta
  )
  select
    v_created_id,
    nullif(line->>'productId', '')::uuid,
    nullif(line->>'productVariantId', '')::uuid,
    line->>'skuCode',
    nullif(line->>'hsnCode', ''),
    line->>'productName',
    line->>'categoryType',
    nullif(line->>'packLabel', ''),
    line->>'basisApplied',
    line->>'pricingMode',
    nullif(line->>'unitsPerCase', '')::numeric,
    nullif(line->>'moq', '')::numeric,
    nullif(line->>'sourceExFactoryUsd', '')::numeric,
    nullif(line->>'sourceFobUsd', '')::numeric,
    nullif(line->>'sourceBulkUsdPerKg', '')::numeric,
    nullif(line->>'sourceExFactoryInr', '')::numeric,
    nullif(line->>'sourceFobInr', '')::numeric,
    nullif(line->>'sourceBulkInrPerKg', '')::numeric,
    nullif(line->>'freightAddOnUsd', '')::numeric,
    nullif(line->>'fxRate', '')::numeric,
    nullif(line->>'finalUnitPrice', '')::numeric,
    nullif(line->>'finalCasePrice', '')::numeric,
    nullif(line->>'finalKgPrice', '')::numeric,
    line->>'displayCurrency',
    coalesce((line->>'isOverridden')::boolean, false),
    nullif(line->>'overrideReason', ''),
    nullif(line->>'lineNotes', ''),
    coalesce((line->>'sortOrder')::integer, 0),
    coalesce(line->'calculationMeta', '{}'::jsonb)
  from jsonb_array_elements(coalesce(p_payload->'compiled'->'lines', '[]'::jsonb)) as line;

  update public.quotes q
  set current_version_id = v_created_id,
      version_no = v_next_version_no,
      pricing_basis = v_pricing_basis,
      display_currency = v_display_currency,
      valid_until = coalesce(v_valid_until, q.valid_until),
      updated_at = now()
  where q.id = v_quote_id;

  return query
  select v_created_id, v_quote_id, v_next_version_no, 'draft'::text;
end;
$$;

create or replace function public.app_send_quote_version_tx(
  p_quote_version_id uuid,
  p_actor_user_id uuid
)
returns void
language plpgsql
as $$
declare
  v_quote_id uuid;
  v_org_id uuid;
  v_status text;
  v_version_no integer;
  v_pricing_basis text;
  v_display_currency text;
  v_valid_until date;
  v_require_approval boolean := false;
  v_requires_approval_override boolean := false;
begin
  select qv.quote_id,
         q.organization_id,
         qv.status,
         qv.version_no,
         qv.pricing_basis,
         qv.display_currency,
         qv.valid_until
  into v_quote_id, v_org_id, v_status, v_version_no, v_pricing_basis, v_display_currency, v_valid_until
  from public.quote_versions qv
  join public.quotes q on q.id = qv.quote_id
  where qv.id = p_quote_version_id
  for update;

  if v_quote_id is null then
    raise exception 'Quote version % not found for send', p_quote_version_id;
  end if;

  if v_status in ('approval_pending', 'rejected', 'cancelled', 'expired', 'superseded', 'accepted') then
    raise exception 'Quote version % cannot be sent from status %', p_quote_version_id, v_status;
  end if;

  select coalesce(ps.require_approval_for_override, false)
  into v_require_approval
  from public.pricing_engine_settings ps
  where ps.organization_id = v_org_id;

  if v_require_approval then
    select exists (
      select 1
      from public.quote_version_line_items qvli
      where qvli.quote_version_id = p_quote_version_id
        and qvli.is_overridden = true
        and coalesce((qvli.calculation_meta->>'override_requires_approval')::boolean, false) = true
    )
    into v_requires_approval_override;

    if v_requires_approval_override and v_status <> 'approved' then
      raise exception 'Quote version % requires approval before send', p_quote_version_id;
    end if;
  end if;

  update public.quote_versions
  set status = 'superseded',
      updated_at = now()
  where quote_id = v_quote_id
    and id <> p_quote_version_id
    and status in ('sent', 'viewed', 'customer_countered');

  update public.quote_versions
  set status = 'sent',
      sent_at = now(),
      sent_by = p_actor_user_id,
      updated_at = now()
  where id = p_quote_version_id;

  update public.quotes
  set current_version_id = p_quote_version_id,
      version_no = v_version_no,
      pricing_basis = v_pricing_basis,
      display_currency = v_display_currency,
      valid_until = coalesce(v_valid_until, valid_until),
      status = 'sent',
      updated_at = now()
  where id = v_quote_id;
end;
$$;

commit;
