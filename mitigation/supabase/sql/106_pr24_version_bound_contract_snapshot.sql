begin;

alter table public.contracts
  add column if not exists accepted_quote_version_id uuid,
  add column if not exists commercial_snapshot_mode text not null default 'legacy_quote_fallback',
  add column if not exists commercial_handoff_at timestamptz;

alter table public.contract_line_items
  add column if not exists source_quote_version_line_item_id uuid,
  add column if not exists continuity_source_mode text not null default 'legacy_quote_fallback';

create index if not exists contracts_accepted_quote_version_idx on public.contracts(accepted_quote_version_id);
create index if not exists contracts_commercial_snapshot_mode_idx on public.contracts(commercial_snapshot_mode);
create index if not exists contract_line_items_source_quote_version_line_item_idx on public.contract_line_items(source_quote_version_line_item_id);

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
  v_accepted_version public.quote_versions%rowtype;
  v_has_accepted_version boolean := false;
begin
  select *
  into v_quote
  from public.quotes
  where public.quotes.id = p_quote_id;

  if not found then
    return '{}'::jsonb;
  end if;

  v_meta := public.app_extract_setuflow_meta(v_quote.notes);

  if v_quote.accepted_version_id is not null then
    select *
    into v_accepted_version
    from public.quote_versions
    where id = v_quote.accepted_version_id;

    v_has_accepted_version := found;
  end if;

  if v_has_accepted_version then
    select
      count(*),
      count(*) filter (where coalesce(is_overridden, false)),
      coalesce(sum(coalesce(moq, 0) * coalesce(final_unit_price, final_case_price, final_kg_price, 0)), 0)
    into v_line_count, v_override_count, v_subtotal
    from public.quote_version_line_items
    where quote_version_id = v_accepted_version.id;

    v_snapshot := jsonb_build_object(
      'quote_id', v_quote.id,
      'quote_status', coalesce(v_accepted_version.status, v_quote.status),
      'quote_currency', coalesce(v_accepted_version.display_currency, v_quote.display_currency, v_quote.currency),
      'pricing_basis', coalesce(v_accepted_version.pricing_basis, v_quote.pricing_basis, v_meta->>'pricingBasis', 'fob'),
      'pricing_basis_label', coalesce(v_accepted_version.pricing_basis, v_quote.pricing_basis, v_meta->>'pricingBasis', 'fob'),
      'approval_required', coalesce(v_quote.approval_required, (v_meta #>> '{approval,required}')::boolean, false),
      'approval_state', case
        when lower(coalesce(v_accepted_version.status, '')) = 'accepted' then 'approved'
        else coalesce(v_meta #>> '{approval,state}', 'not_required')
      end,
      'approval_label', case
        when lower(coalesce(v_accepted_version.status, '')) = 'accepted' then 'Approved and accepted'
        else coalesce(v_meta #>> '{approval,state}', 'not_required')
      end,
      'approved_at', coalesce(v_accepted_version.approved_at::text, v_quote.approved_at::text, v_meta #>> '{approval,actedAt}'),
      'approval_actor', coalesce(v_meta #>> '{approval,actorName}', null),
      'sent_at', coalesce(v_accepted_version.sent_at::text, v_meta->>'sentAt', null),
      'accepted_at', case when lower(coalesce(v_accepted_version.status, '')) = 'accepted' then coalesce(v_accepted_version.updated_at::text, v_quote.updated_at::text, timezone('utc', now())::text) else null end,
      'line_count', v_line_count,
      'override_count', v_override_count,
      'subtotal', v_subtotal,
      'lock_state', case
        when lower(coalesce(v_accepted_version.status, '')) = 'accepted' then 'accepted_locked'
        when lower(coalesce(v_accepted_version.status, '')) = 'sent' then 'sent_locked'
        when lower(coalesce(v_accepted_version.status, '')) = 'approved' then 'approved_ready'
        else 'draft_open'
      end,
      'snapshot_mode', 'version_bound',
      'accepted_version_id', v_accepted_version.id,
      'accepted_version_no', v_accepted_version.version_no,
      'current_version_id', v_quote.current_version_id,
      'source_handoff_label', format('Accepted quote version v%s', coalesce(v_accepted_version.version_no::text, '—')),
      'commercial_handoff_at', coalesce(v_quote.updated_at::text, timezone('utc', now())::text),
      'commercial_source_truth', 'accepted_quote_version'
    );

    return v_snapshot;
  end if;

  select
    count(*),
    count(*) filter (where coalesce(is_price_overridden, false)),
    coalesce(sum(coalesce(quantity, 0) * coalesce(unit_price, catalog_price_amount, 0)), 0)
  into v_line_count, v_override_count, v_subtotal
  from public.quote_line_items
  where public.quote_line_items.quote_id = p_quote_id;

  v_snapshot := jsonb_build_object(
    'quote_id', v_quote.id,
    'quote_status', v_quote.status,
    'quote_currency', v_quote.currency,
    'pricing_basis', coalesce(v_meta->>'pricingBasis', v_quote.pricing_basis, 'fob'),
    'approval_required', coalesce((v_meta #>> '{approval,required}')::boolean, v_quote.approval_required, false),
    'approval_state', coalesce(v_meta #>> '{approval,state}', case when v_quote.approved_at is not null then 'approved' else 'not_required' end),
    'approved_at', coalesce(v_quote.approved_at::text, v_meta #>> '{approval,actedAt}', null),
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
    end,
    'snapshot_mode', 'legacy_quote_fallback',
    'accepted_version_id', v_quote.accepted_version_id,
    'accepted_version_no', null,
    'current_version_id', v_quote.current_version_id,
    'source_handoff_label', 'Legacy quote-level contract snapshot',
    'commercial_handoff_at', coalesce(v_quote.updated_at::text, timezone('utc', now())::text),
    'commercial_source_truth', 'quote_level_fallback'
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
  v_snapshot_mode text := 'legacy_quote_fallback';
  v_accepted_version_id uuid;
begin
  v_snapshot := public.app_quote_contract_snapshot(p_quote_id);
  v_snapshot_mode := coalesce(v_snapshot->>'snapshot_mode', 'legacy_quote_fallback');
  v_accepted_version_id := nullif(v_snapshot->>'accepted_version_id', '')::uuid;

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
      when coalesce(v_snapshot->>'lock_state', '') in ('approved_ready', 'sent_locked', 'contract_locked', 'accepted_locked') then coalesce(locked_at, timezone('utc', now()))
      else locked_at
    end,
    accepted_quote_version_id = v_accepted_version_id,
    commercial_snapshot_mode = v_snapshot_mode,
    commercial_handoff_at = coalesce(nullif(v_snapshot->>'commercial_handoff_at', '')::timestamptz, commercial_handoff_at, timezone('utc', now())),
    commercial_snapshot = v_snapshot,
    updated_at = timezone('utc', now())
  where id = p_contract_id
    and organization_id = p_organization_id
    and quote_id = p_quote_id
    and lead_id = p_lead_id;

  delete from public.contract_line_items
  where contract_id = p_contract_id;

  if v_snapshot_mode = 'version_bound' and v_accepted_version_id is not null then
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
      source_quote_version_line_item_id,
      continuity_source_mode,
      continuity_snapshot
    )
    select
      p_contract_id,
      qvli.product_id,
      qvli.product_variant_id,
      coalesce(qvli.moq, 1),
      coalesce(qvli.final_unit_price, qvli.final_case_price, qvli.final_kg_price),
      qvli.display_currency,
      qvli.line_notes,
      null,
      null,
      qvli.display_currency,
      coalesce(qvli.is_overridden, false),
      qvli.override_reason,
      qvli.overridden_by,
      qvli.overridden_at,
      null,
      qvli.id,
      'version_bound',
      jsonb_build_object(
        'quote_version_line_item_id', qvli.id,
        'quote_version_id', qvli.quote_version_id,
        'accepted_version_id', v_accepted_version_id,
        'source_mode', 'version_bound',
        'product_id', qvli.product_id,
        'product_variant_id', qvli.product_variant_id,
        'quantity', qvli.moq,
        'final_unit_price', coalesce(qvli.final_unit_price, qvli.final_case_price, qvli.final_kg_price),
        'currency', qvli.display_currency,
        'is_price_overridden', coalesce(qvli.is_overridden, false),
        'override_reason', qvli.override_reason,
        'notes', qvli.line_notes
      )
    from public.quote_version_line_items qvli
    where qvli.quote_version_id = v_accepted_version_id;
  else
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
      source_quote_version_line_item_id,
      continuity_source_mode,
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
      null,
      'legacy_quote_fallback',
      jsonb_build_object(
        'quote_line_item_id', qli.id,
        'source_mode', 'legacy_quote_fallback',
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
  end if;
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
    when coalesce(s.snapshot->>'lock_state', '') in ('approved_ready', 'sent_locked', 'contract_locked', 'accepted_locked') then coalesce(c.locked_at, timezone('utc', now()))
    else c.locked_at
  end,
  accepted_quote_version_id = nullif(s.snapshot->>'accepted_version_id', '')::uuid,
  commercial_snapshot_mode = coalesce(s.snapshot->>'snapshot_mode', 'legacy_quote_fallback'),
  commercial_handoff_at = coalesce(nullif(s.snapshot->>'commercial_handoff_at', '')::timestamptz, c.commercial_handoff_at, timezone('utc', now())),
  commercial_snapshot = s.snapshot
from (
  select c.id, public.app_quote_contract_snapshot(c.quote_id) as snapshot
  from public.contracts c
) s
where c.id = s.id;

update public.contract_line_items cli
set
  source_quote_line_item_id = qli.id,
  continuity_source_mode = 'legacy_quote_fallback',
  continuity_snapshot = jsonb_build_object(
    'quote_line_item_id', qli.id,
    'source_mode', 'legacy_quote_fallback',
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
  and coalesce(c.commercial_snapshot_mode, 'legacy_quote_fallback') <> 'version_bound'
  and qli.quote_id = c.quote_id
  and coalesce(qli.product_id::text, '') = coalesce(cli.product_id::text, '')
  and coalesce(qli.product_variant_id::text, '') = coalesce(cli.product_variant_id::text, '')
  and coalesce(qli.quantity, 0) = coalesce(cli.quantity, 0)
  and coalesce(qli.unit_price, 0) = coalesce(cli.unit_price, 0);

update public.contract_line_items cli
set
  source_quote_version_line_item_id = qvli.id,
  continuity_source_mode = 'version_bound',
  continuity_snapshot = jsonb_build_object(
    'quote_version_line_item_id', qvli.id,
    'quote_version_id', qvli.quote_version_id,
    'accepted_version_id', c.accepted_quote_version_id,
    'source_mode', 'version_bound',
    'product_id', qvli.product_id,
    'product_variant_id', qvli.product_variant_id,
    'quantity', qvli.moq,
    'final_unit_price', coalesce(qvli.final_unit_price, qvli.final_case_price, qvli.final_kg_price),
    'currency', qvli.display_currency,
    'is_price_overridden', coalesce(qvli.is_overridden, false),
    'override_reason', qvli.override_reason,
    'notes', qvli.line_notes
  )
from public.contracts c, public.quote_version_line_items qvli
where cli.contract_id = c.id
  and c.accepted_quote_version_id is not null
  and coalesce(c.commercial_snapshot_mode, 'legacy_quote_fallback') = 'version_bound'
  and qvli.quote_version_id = c.accepted_quote_version_id
  and coalesce(qvli.product_id::text, '') = coalesce(cli.product_id::text, '')
  and coalesce(qvli.product_variant_id::text, '') = coalesce(cli.product_variant_id::text, '')
  and coalesce(qvli.moq, 0) = coalesce(cli.quantity, 0)
  and coalesce(coalesce(qvli.final_unit_price, qvli.final_case_price, qvli.final_kg_price), 0) = coalesce(cli.unit_price, 0);

commit;
