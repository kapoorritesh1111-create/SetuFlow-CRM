alter table public.product_categories add column if not exists is_preview boolean not null default false;
alter table public.product_categories add column if not exists source text;
alter table public.products add column if not exists is_preview boolean not null default false;
alter table public.products add column if not exists source text;

with trial_orgs as (
  select distinct organization_id, coalesce(nullif(main_product_category, ''), 'Trade Show Preview') as category_name
  from public.trade_show_trial_workspaces
  where organization_id is not null
), preview_categories as (
  insert into public.product_categories (organization_id, name, sort_order, is_active, is_preview, source)
  select organization_id, category_name, 1, true, true, 'trade_show_trial_preview'
  from trial_orgs
  where not exists (
    select 1 from public.product_categories pc
    where pc.organization_id = trial_orgs.organization_id
      and pc.source = 'trade_show_trial_preview'
      and pc.is_preview = true
  )
  returning id, organization_id, name
), all_preview_categories as (
  select id, organization_id, name
  from public.product_categories
  where is_preview = true and source = 'trade_show_trial_preview'
)
insert into public.products (organization_id, category_id, name, sku, description, is_active, sort_order, pricing_currency, is_preview, source)
select c.organization_id, c.id, item.name, item.sku,
       'Preview data only. Hidden after upgrade.',
       true, item.sort_order, 'USD', true, 'trade_show_trial_preview'
from all_preview_categories c
cross join lateral (
  values
    ('Preview Health Snack Variety Pack', 'TRIAL-HS-001', 1),
    ('Preview Protein Snack Bites', 'TRIAL-HS-002', 2),
    ('Preview Fruit & Veggie Chips', 'TRIAL-HS-003', 3)
) as item(name, sku, sort_order)
where not exists (
  select 1 from public.products p
  where p.organization_id = c.organization_id
    and p.sku = item.sku
    and p.source = 'trade_show_trial_preview'
);

insert into public.product_variants (
  product_id,
  organization_id,
  name,
  sku_code,
  variant_code,
  pack_size_value,
  pack_size_unit,
  pack_label,
  units_per_case,
  moq_cases,
  pricing_mode_default,
  is_active,
  is_quoteable,
  sort_order,
  source_sheet_name,
  source_payload
)
select
  p.id,
  p.organization_id,
  'Trial preview pack',
  coalesce(p.sku, 'TRIAL-PREVIEW'),
  coalesce(p.sku, 'TRIAL-PREVIEW'),
  1,
  'case',
  '1 case preview pack',
  12,
  10,
  'case',
  true,
  true,
  coalesce(p.sort_order, 0),
  'trade_show_trial_preview',
  jsonb_build_object('source','trade_show_trial_preview','preview_only',true)
from public.products p
where p.source = 'trade_show_trial_preview'
  and not exists (
    select 1 from public.product_variants v
    where v.product_id = p.id
      and v.source_sheet_name = 'trade_show_trial_preview'
  );

with preview_leads as (
  select distinct on (l.organization_id)
    l.organization_id,
    l.id as lead_id,
    l.owner_user_id,
    l.country_id
  from public.leads l
  join public.trade_show_trial_workspaces t on t.organization_id = l.organization_id
  where l.lead_type = 'buyer'
  order by l.organization_id, l.created_at asc
)
insert into public.documents (organization_id, related_entity, related_id, file_name, file_url, doc_type, version, status, version_label, requirement_code)
select pl.organization_id, 'lead', pl.lead_id, item.file_name, item.file_url, item.doc_type, 1, 'approved', 'Preview', 'trade_show_trial_preview'
from preview_leads pl
cross join lateral (
  values
    ('sample-commercial-quote.pdf','/preview/sample-commercial-quote.pdf','commercial_quote'),
    ('sample-proforma-invoice.pdf','/preview/sample-proforma-invoice.pdf','proforma_invoice'),
    ('sample-packing-list.pdf','/preview/sample-packing-list.pdf','packing_list')
) as item(file_name, file_url, doc_type)
where not exists (
  select 1 from public.documents d
  where d.organization_id = pl.organization_id
    and d.file_name = item.file_name
);

with preview_leads as (
  select distinct on (l.organization_id)
    l.organization_id,
    l.id as lead_id,
    l.owner_user_id,
    l.country_id
  from public.leads l
  join public.trade_show_trial_workspaces t on t.organization_id = l.organization_id
  where l.lead_type = 'buyer'
  order by l.organization_id, l.created_at asc
)
insert into public.quotes (organization_id, lead_id, created_by, status, currency, notes, quote_number, version_no, pricing_basis, display_currency, valid_until, country_id, source_type, approval_required, notes_internal, source_file_name, source_hash, lifecycle_outcome)
select pl.organization_id, pl.lead_id, pl.owner_user_id, 'sent', 'USD', 'Preview only.', 'TRIAL-Q-' || upper(substr(pl.organization_id::text,1,6)), 1, 'fob', 'USD', current_date + interval '14 days', pl.country_id, 'manual', false, 'source=trade_show_trial_preview; preview_only=true', 'trade_show_trial_preview_seed', md5(pl.organization_id::text || 'trial_quote'), 'sent_follow_up'
from preview_leads pl
where not exists (
  select 1 from public.quotes q
  where q.organization_id = pl.organization_id
    and q.source_file_name = 'trade_show_trial_preview_seed'
);

with q as (
  select q.id, q.organization_id, q.created_by
  from public.quotes q
  where q.source_file_name = 'trade_show_trial_preview_seed'
), inserted_versions as (
  insert into public.quote_versions (quote_id, version_no, status, pricing_basis, display_currency, valid_until, customer_message, internal_notes, sent_at, sent_by, approved_at, approved_by, total_line_count, created_by, source_file_name, source_hash)
  select q.id, 1, 'sent', 'fob', 'USD', current_date + interval '14 days', 'Preview only.', 'preview_only=true', now() - interval '1 day', q.created_by, now() - interval '1 day', q.created_by, 1, q.created_by, 'trade_show_trial_preview_seed', md5(q.id::text || 'version')
  from q
  where not exists (
    select 1 from public.quote_versions v
    where v.quote_id = q.id
      and v.source_file_name = 'trade_show_trial_preview_seed'
  )
  returning id, quote_id
), all_versions as (
  select id, quote_id from inserted_versions
  union all
  select id, quote_id
  from public.quote_versions
  where source_file_name = 'trade_show_trial_preview_seed'
)
update public.quotes q
set current_version_id = v.id,
    sent_version_id = v.id,
    accepted_version_id = v.id,
    status = 'accepted',
    updated_at = now()
from all_versions v
where q.id = v.quote_id
  and q.source_file_name = 'trade_show_trial_preview_seed';

with q as (
  select q.id as quote_id, q.organization_id, q.current_version_id
  from public.quotes q
  where q.source_file_name = 'trade_show_trial_preview_seed'
), p as (
  select distinct on (p.organization_id)
    p.organization_id,
    p.id as product_id,
    p.category_id,
    p.name,
    p.sku,
    v.id as variant_id,
    v.sku_code,
    v.pack_label,
    v.units_per_case,
    v.moq_cases
  from public.products p
  join public.product_variants v on v.product_id = p.id and v.organization_id = p.organization_id
  where p.source = 'trade_show_trial_preview'
  order by p.organization_id, p.sort_order nulls last, p.name
)
insert into public.quote_line_items (quote_id, product_id, quantity, unit_price, currency, product_variant_id, catalog_price_amount, catalog_price_currency, is_price_overridden)
select q.quote_id, p.product_id, 25, 32, 'USD', p.variant_id, 32, 'USD', false
from q
join p on p.organization_id = q.organization_id
where not exists (
  select 1 from public.quote_line_items li
  where li.quote_id = q.quote_id
    and li.product_id = p.product_id
);

with q as (
  select q.id as quote_id, q.organization_id, q.current_version_id
  from public.quotes q
  where q.source_file_name = 'trade_show_trial_preview_seed'
), p as (
  select distinct on (p.organization_id)
    p.organization_id,
    p.id as product_id,
    p.name,
    p.sku,
    v.id as variant_id,
    v.sku_code,
    v.pack_label,
    v.units_per_case,
    v.moq_cases
  from public.products p
  join public.product_variants v on v.product_id = p.id and v.organization_id = p.organization_id
  where p.source = 'trade_show_trial_preview'
  order by p.organization_id, p.sort_order nulls last, p.name
)
insert into public.quote_version_line_items (quote_version_id, product_id, product_variant_id, sku_code, product_name, category_type, pack_label, basis_applied, pricing_mode, units_per_case, moq, source_ex_factory_usd, source_fob_usd, final_unit_price, final_case_price, display_currency, sort_order)
select q.current_version_id, p.product_id, p.variant_id, coalesce(p.sku_code,p.sku,'TRIAL'), p.name, 'Health Snacks', coalesce(p.pack_label,'Trial pack'), 'fob', 'case', coalesce(p.units_per_case,12), coalesce(p.moq_cases,10), 24, 32, 2.67, 32, 'USD', 1
from q
join p on p.organization_id = q.organization_id
where q.current_version_id is not null
  and not exists (
    select 1 from public.quote_version_line_items li
    where li.quote_version_id = q.current_version_id
      and li.product_id = p.product_id
  );

insert into public.orders (organization_id, lead_id, source_quote_id, source_quote_version_id, order_number, order_type, current_stage, status, approval_state, currency, pricing_basis, incoterm, payment_terms, origin_place, destination_place, destination_port, buyer_reference, internal_notes, customer_notes, total_order_value, metadata, created_by, updated_by, order_lifecycle_status, payment_status, fulfillment_status, dispatch_status)
select q.organization_id, q.lead_id, q.id, q.current_version_id, 'TRIAL-O-' || upper(substr(q.organization_id::text,1,6)), 'export', 'internal_review', 'active', 'proforma_invoice_prepared', 'USD', 'fob', 'FOB', '50% advance / 50% before dispatch', 'Dublin Foods preview warehouse', 'Buyer destination preview', 'Dublin Port', 'TRIAL-PO-PREVIEW', 'Preview only.', 'Preview only.', 800, jsonb_build_object('source','trade_show_trial_preview','is_preview',true), q.created_by, q.created_by, 'order_created', 'not_requested', 'not_started', 'not_ready'
from public.quotes q
where q.source_file_name = 'trade_show_trial_preview_seed'
  and q.status = 'accepted'
  and q.current_version_id is not null
  and not exists (
    select 1 from public.orders o
    where o.organization_id = q.organization_id
      and o.metadata->>'source' = 'trade_show_trial_preview'
  );

with o as (
  select id, organization_id
  from public.orders
  where metadata->>'source' = 'trade_show_trial_preview'
), p as (
  select distinct on (p.organization_id)
    p.organization_id,
    p.id as product_id,
    p.category_id,
    p.name,
    p.sku,
    v.id as variant_id,
    v.sku_code,
    v.pack_label
  from public.products p
  join public.product_variants v on v.product_id = p.id and v.organization_id = p.organization_id
  where p.source = 'trade_show_trial_preview'
  order by p.organization_id, p.sort_order nulls last, p.name
)
insert into public.order_lines (organization_id, order_id, product_id, product_variant_id, product_category_id, product_name_snapshot, variant_name_snapshot, category_snapshot, sku_code, quoted_quantity, ordered_quantity, approved_quantity, unit_of_measure, unit_price, currency, line_total, line_status, change_type, pricing_snapshot, product_snapshot)
select o.organization_id, o.id, p.product_id, p.variant_id, p.category_id, p.name, coalesce(p.pack_label,'Trial pack'), 'Health Snacks', coalesce(p.sku_code,p.sku,'TRIAL'), 25, 25, 25, 'case', 32, 'USD', 800, 'confirmed', 'from_quote', jsonb_build_object('source','trade_show_trial_preview'), jsonb_build_object('source','trade_show_trial_preview')
from o
join p on p.organization_id = o.organization_id
where not exists (
  select 1 from public.order_lines ol
  where ol.order_id = o.id
    and ol.product_id = p.product_id
);

with o as (
  select id, organization_id
  from public.orders
  where metadata->>'source' = 'trade_show_trial_preview'
), d as (
  select id, organization_id, doc_type, status, file_url
  from public.documents
  where requirement_code = 'trade_show_trial_preview'
)
insert into public.order_documents (organization_id, order_id, document_id, document_type, stage_key, status, version_no, generated_from_snapshot, source_snapshot, pdf_storage_path)
select o.organization_id, o.id, d.id, d.doc_type, case when d.doc_type = 'packing_list' then 'packing' else 'finance' end, 'draft', 1, jsonb_build_object('source','trade_show_trial_preview'), jsonb_build_object('source','trade_show_trial_preview'), d.file_url
from o
join d on d.organization_id = o.organization_id
where not exists (
  select 1 from public.order_documents od
  where od.organization_id = o.organization_id
    and od.document_id = d.id
);
