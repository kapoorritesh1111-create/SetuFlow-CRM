begin;

alter table public.contracts
  add column if not exists commercial_lock_state text,
  add column if not exists quote_currency text,
  add column if not exists pricing_basis text,
  add column if not exists approval_required boolean not null default false,
  add column if not exists approval_state text not null default 'not_required',
  add column if not exists approved_at timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists locked_at timestamptz,
  add column if not exists commercial_snapshot jsonb not null default '{}'::jsonb;

alter table public.contract_line_items
  add column if not exists source_quote_line_item_id uuid,
  add column if not exists continuity_snapshot jsonb not null default '{}'::jsonb;

create index if not exists contracts_commercial_lock_state_idx on public.contracts(commercial_lock_state);
create index if not exists contract_line_items_source_quote_line_item_idx on public.contract_line_items(source_quote_line_item_id);

create or replace function public.app_extract_setuflow_meta(p_notes text)
returns jsonb
language sql
immutable
as $$
  select case
    when p_notes is null or position('SETUFLOW_META:' in p_notes) = 0 then '{}'::jsonb
    else coalesce(nullif(split_part(p_notes, 'SETUFLOW_META:', 2), '')::jsonb, '{}'::jsonb)
  end;
$$;

create or replace function public.app_quote_contract_snapshot(p_quote_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.quotes%rowtype;
  v_meta jsonb := '{}'::jsonb;
  v_line_count integer := 0;
  v_override_count integer := 0;
  v_subtotal numeric := 0;
  v_snapshot jsonb := '{}'::jsonb;
begin
  select *
  into v_quote
  from public.quotes
  where public.quotes.id = p_quote_id;

  if not found then
    return '{}'::jsonb;
  end if;

  v_meta := public.app_extract_setuflow_meta(v_quote.notes);

  select
    count(*),
    count(*) filter (where coalesce(is_price_overridden, false)),
    coalesce(sum(coalesce(quantity, 0) * coalesce(unit_price, catalog_price_amount, 0)), 0)
  into v_line_count, v_override_count, v_subtotal
  from public.quote_line_items
  where quote_id = p_quote_id;

  v_snapshot := jsonb_build_object(
    'quote_id', v_quote.id,
    'quote_status', v_quote.status,
    'quote_currency', v_quote.currency,
    'pricing_basis', coalesce(v_meta->>'pricingBasis', 'fob'),
    'approval_required', coalesce((v_meta #>> '{approval,required}')::boolean, false),
    'approval_state', coalesce(v_meta #>> '{approval,state}', 'not_required'),
    'approved_at', coalesce(v_meta #>> '{approval,actedAt}', null),
    'approval_actor', coalesce(v_meta #>> '{approval,actorName}', null),
    'sent_at', coalesce(v_meta->>'sentAt', null),
    'accepted_at', case when lower(coalesce(v_quote.status, '')) = 'accepted' then coalesce(v_quote.updated_at::text, timezone('utc', now())::text) else null end,
    'line_count', v_line_count,
    'override_count', v_override_count,
    'subtotal', v_subtotal,
    'lock_state', case
      when lower(coalesce(v_quote.status, '')) = 'accepted' then 'contract_locked'
      when lower(coalesce(v_quote.status, '')) = 'sent' then 'sent_locked'
      when lower(coalesce(v_quote.status, '')) = 'approved' then 'approved_ready'
      else 'draft_open'
    end
  );

  return v_snapshot;
end;
$$;

create or replace function public.app_sync_contract_from_quote_tx(
  p_organization_id uuid,
  p_contract_id uuid,
  p_quote_id uuid,
  p_lead_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_snapshot jsonb := '{}'::jsonb;
begin
  v_snapshot := public.app_quote_contract_snapshot(p_quote_id);

  update public.contracts
  set
    quote_currency = v_snapshot->>'quote_currency',
    pricing_basis = v_snapshot->>'pricing_basis',
    approval_required = coalesce((v_snapshot->>'approval_required')::boolean, false),
    approval_state = coalesce(v_snapshot->>'approval_state', 'not_required'),
    approved_at = nullif(v_snapshot->>'approved_at', '')::timestamptz,
    sent_at = nullif(v_snapshot->>'sent_at', '')::timestamptz,
    accepted_at = nullif(v_snapshot->>'accepted_at', '')::timestamptz,
    commercial_lock_state = coalesce(v_snapshot->>'lock_state', 'draft_open'),
    locked_at = case
      when coalesce(v_snapshot->>'lock_state', '') in ('approved_ready', 'sent_locked', 'contract_locked') then coalesce(locked_at, timezone('utc', now()))
      else locked_at
    end,
    commercial_snapshot = v_snapshot,
    updated_at = timezone('utc', now())
  where id = p_contract_id
    and organization_id = p_organization_id
    and quote_id = p_quote_id
    and lead_id = p_lead_id;

  delete from public.contract_line_items
  where contract_id = p_contract_id;

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
    overridden_at,
    source_quote_line_item_id,
    continuity_snapshot
  )
  select
    p_contract_id,
    qli.product_id,
    qli.product_variant_id,
    coalesce(qli.quantity, 1),
    qli.unit_price,
    qli.currency,
    qli.notes,
    qli.catalog_price_id,
    qli.catalog_price_amount,
    qli.catalog_price_currency,
    coalesce(qli.is_price_overridden, false),
    qli.override_reason,
    qli.overridden_by,
    qli.overridden_at,
    qli.id,
    jsonb_build_object(
      'quote_line_item_id', qli.id,
      'product_id', qli.product_id,
      'product_variant_id', qli.product_variant_id,
      'quantity', qli.quantity,
      'catalog_price_amount', qli.catalog_price_amount,
      'catalog_price_currency', qli.catalog_price_currency,
      'final_unit_price', qli.unit_price,
      'currency', qli.currency,
      'is_price_overridden', coalesce(qli.is_price_overridden, false),
      'override_reason', qli.override_reason,
      'notes', qli.notes
    )
  from public.quote_line_items qli
  where qli.quote_id = p_quote_id;
end;
$$;

update public.contracts c
set
  quote_currency = s.snapshot->>'quote_currency',
  pricing_basis = s.snapshot->>'pricing_basis',
  approval_required = coalesce((s.snapshot->>'approval_required')::boolean, false),
  approval_state = coalesce(s.snapshot->>'approval_state', 'not_required'),
  approved_at = nullif(s.snapshot->>'approved_at', '')::timestamptz,
  sent_at = nullif(s.snapshot->>'sent_at', '')::timestamptz,
  accepted_at = nullif(s.snapshot->>'accepted_at', '')::timestamptz,
  commercial_lock_state = coalesce(s.snapshot->>'lock_state', 'draft_open'),
  locked_at = case
    when coalesce(s.snapshot->>'lock_state', '') in ('approved_ready', 'sent_locked', 'contract_locked') then coalesce(c.locked_at, timezone('utc', now()))
    else c.locked_at
  end,
  commercial_snapshot = s.snapshot
from (
  select id, public.app_quote_contract_snapshot(quote_id) as snapshot
  from public.contracts
) s
where c.id = s.id;

update public.contract_line_items cli
set
  source_quote_line_item_id = qli.id,
  continuity_snapshot = jsonb_build_object(
    'quote_line_item_id', qli.id,
    'product_id', qli.product_id,
    'product_variant_id', qli.product_variant_id,
    'quantity', qli.quantity,
    'catalog_price_amount', qli.catalog_price_amount,
    'catalog_price_currency', qli.catalog_price_currency,
    'final_unit_price', qli.unit_price,
    'currency', qli.currency,
    'is_price_overridden', coalesce(qli.is_price_overridden, false),
    'override_reason', qli.override_reason,
    'notes', qli.notes
  )
from public.contracts c, public.quote_line_items qli
where cli.contract_id = c.id
  and qli.quote_id = c.quote_id
  and coalesce(qli.product_id::text, '') = coalesce(cli.product_id::text, '')
  and coalesce(qli.product_variant_id::text, '') = coalesce(cli.product_variant_id::text, '')
  and coalesce(qli.quantity, 0) = coalesce(cli.quantity, 0)
  and coalesce(qli.unit_price, 0) = coalesce(cli.unit_price, 0);

commit;
