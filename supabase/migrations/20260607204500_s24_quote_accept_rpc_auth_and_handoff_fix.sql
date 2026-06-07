-- Sprint 24 follow-up for S24-205 through S24-208
--
-- Fixes the underlying accepted-quote outcome path, not only one quote.
-- Live review showed valid sent quotes could return quote-outcome-error because
-- the guarded RPC required auth.uid() to exactly match the supplied actor and
-- still inserted legacy order defaults. This version:
--   - resolves an authenticated/member actor from auth.uid() or p_actor_user_id,
--   - keeps membership guardrails,
--   - rejects zero-line quotes before acceptance,
--   - marks the quote/version accepted,
--   - ensures contract and order handoff rows,
--   - uses order defaults that satisfy current order constraints.

create or replace function public.app_safe_accept_sent_quote_tx(
  p_organization_id uuid,
  p_quote_id uuid,
  p_actor_user_id uuid,
  p_notes text default null::text,
  out quote_id uuid,
  out lead_id uuid,
  out accepted_version_id uuid,
  out order_id uuid,
  out contract_id uuid
)
returns record
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  q record;
  v uuid;
  n timestamptz := now();
  c uuid;
  o uuid;
  total numeric := 0;
  v_actor uuid := coalesce(auth.uid(), p_actor_user_id);
begin
  if v_actor is null then
    raise exception 'Authentication required';
  end if;

  if auth.uid() is not null and p_actor_user_id is not null and auth.uid() <> p_actor_user_id then
    raise exception 'Authentication mismatch';
  end if;

  if not exists(
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = v_actor
      and m.is_active is true
  ) then
    raise exception 'Workspace membership required';
  end if;

  select qt.id, qt.lead_id, qt.status, qt.current_version_id, qt.sent_version_id, qt.accepted_version_id, qt.currency
  into q
  from public.quotes qt
  where qt.organization_id = p_organization_id
    and qt.id = p_quote_id
  for update;

  if not found then
    raise exception 'Quote not found';
  end if;

  v := coalesce(q.accepted_version_id, q.sent_version_id, q.current_version_id);
  if v is null then
    raise exception 'Quote version missing';
  end if;

  if lower(coalesce(q.status, '')) not in ('sent', 'accepted') then
    raise exception 'Quote must be sent or accepted';
  end if;

  if not exists(select 1 from public.quote_line_items l where l.quote_id = p_quote_id) then
    raise exception 'Cannot accept quote without line items';
  end if;

  update public.quotes qt
  set status = 'accepted',
      accepted_version_id = coalesce(qt.accepted_version_id, v),
      lifecycle_outcome = 'accepted_handoff',
      last_customer_response_at = coalesce(last_customer_response_at, n),
      archived_at = null,
      archive_reason = null,
      updated_at = n
  where qt.organization_id = p_organization_id
    and qt.id = p_quote_id;

  update public.quote_versions qv
  set status = 'accepted',
      approved_at = coalesce(approved_at, n),
      approved_by = coalesce(approved_by, v_actor),
      updated_at = n
  where qv.id = v
    and qv.quote_id = p_quote_id;

  select ct.id
  into c
  from public.contracts ct
  where ct.organization_id = p_organization_id
    and ct.quote_id = p_quote_id
  order by ct.updated_at desc nulls last
  limit 1;

  if c is null then
    insert into public.contracts(
      organization_id,
      quote_id,
      lead_id,
      status,
      signed_at,
      commercial_lock_state,
      quote_currency,
      approval_required,
      approval_state,
      approved_at,
      sent_at,
      accepted_at,
      locked_at,
      accepted_quote_version_id,
      commercial_handoff_at,
      commercial_snapshot,
      execution_state,
      execution_blockers,
      execution_snapshot,
      commercial_snapshot_mode,
      notes
    ) values (
      p_organization_id,
      p_quote_id,
      q.lead_id,
      'signed',
      n,
      'locked',
      q.currency,
      false,
      'not_required',
      n,
      n,
      n,
      n,
      v,
      n,
      jsonb_build_object('quote_id', p_quote_id, 'quote_version_id', v),
      'ready',
      '[]'::jsonb,
      jsonb_build_object('quote_id', p_quote_id),
      'quote_acceptance_handoff',
      nullif(p_notes, '')
    ) returning id into c;
  end if;

  insert into public.contract_line_items(
    organization_id,
    contract_id,
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
    notes,
    source_quote_line_item_id,
    continuity_snapshot,
    continuity_source_mode
  )
  select
    p_organization_id,
    c,
    l.product_id,
    l.product_variant_id,
    l.catalog_price_id,
    l.catalog_price_amount,
    l.catalog_price_currency,
    l.quantity,
    l.unit_price,
    l.currency,
    coalesce(l.is_price_overridden, false),
    l.override_reason,
    l.overridden_by,
    l.overridden_at,
    l.notes,
    l.id,
    jsonb_build_object('quote_id', p_quote_id, 'quote_version_id', v),
    'quote_line_item'
  from public.quote_line_items l
  where l.quote_id = p_quote_id
    and not exists(
      select 1
      from public.contract_line_items x
      where x.contract_id = c
        and x.source_quote_line_item_id = l.id
    );

  select coalesce(sum(coalesce(l.quantity, 0) * coalesce(l.unit_price, 0)), 0)
  into total
  from public.quote_line_items l
  where l.quote_id = p_quote_id;

  select ord.id
  into o
  from public.orders ord
  where ord.organization_id = p_organization_id
    and ord.source_quote_id = p_quote_id
  order by ord.updated_at desc nulls last
  limit 1;

  if o is null then
    insert into public.orders(
      organization_id,
      legacy_contract_id,
      lead_id,
      source_quote_id,
      source_quote_version_id,
      order_type,
      current_stage,
      status,
      approval_state,
      currency,
      total_order_value,
      metadata,
      created_by,
      updated_by
    ) values (
      p_organization_id,
      c,
      q.lead_id,
      p_quote_id,
      v,
      'regional',
      'internal_review',
      'active',
      'proforma_invoice_prepared',
      q.currency,
      total,
      jsonb_build_object('contract_id', c, 'quote_id', p_quote_id, 'source', 'app_safe_accept_sent_quote_tx'),
      v_actor,
      v_actor
    ) returning id into o;
  else
    update public.orders
    set legacy_contract_id = coalesce(legacy_contract_id, c),
        source_quote_version_id = coalesce(source_quote_version_id, v),
        current_stage = case when current_stage in ('quote_approved', 'draft') then 'internal_review' else current_stage end,
        status = case when status = 'draft' then 'active' else status end,
        approval_state = case when approval_state in ('draft', 'not_required') then 'proforma_invoice_prepared' else approval_state end,
        updated_at = n
    where id = o;
  end if;

  quote_id := p_quote_id;
  lead_id := q.lead_id;
  accepted_version_id := v;
  order_id := o;
  contract_id := c;
  return;
end
$function$;

grant execute on function public.app_safe_accept_sent_quote_tx(uuid, uuid, uuid, text) to authenticated;
