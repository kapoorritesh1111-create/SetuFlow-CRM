create or replace function public.seed_trade_show_trial_preview_data(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category_id uuid;
  v_product_id uuid;
  v_variant_id uuid;
  v_lead_id uuid;
  v_owner_user_id uuid;
  v_country_id uuid;
  v_quote_id uuid;
  v_version_id uuid;
  v_order_id uuid;
  v_doc record;
begin
  select l.id, l.owner_user_id, l.country_id
    into v_lead_id, v_owner_user_id, v_country_id
  from public.leads l
  where l.organization_id = p_organization_id
    and l.lead_type = 'buyer'
  order by l.created_at asc
  limit 1;

  if v_lead_id is null then
    return;
  end if;

  insert into public.product_categories (organization_id, name, sort_order, is_active, is_preview, source)
  select p_organization_id, coalesce(nullif(t.main_product_category, ''), 'Trade Show Preview'), 1, true, true, 'trade_show_trial_preview'
  from public.trade_show_trial_workspaces t
  where t.organization_id = p_organization_id
    and not exists (
      select 1 from public.product_categories pc
      where pc.organization_id = p_organization_id
        and pc.source = 'trade_show_trial_preview'
    )
  limit 1
  returning id into v_category_id;

  if v_category_id is null then
    select pc.id into v_category_id
    from public.product_categories pc
    where pc.organization_id = p_organization_id
      and pc.source = 'trade_show_trial_preview'
    order by pc.created_at asc nulls last, pc.name asc
    limit 1;
  end if;

  if v_category_id is null then
    return;
  end if;

  insert into public.products (organization_id, category_id, name, sku, description, is_active, sort_order, pricing_currency, is_preview, source)
  select p_organization_id, v_category_id, item.name, item.sku, 'Preview data only. Hidden after upgrade.', true, item.sort_order, 'USD', true, 'trade_show_trial_preview'
  from (values
    ('Preview Health Snack Variety Pack', 'TRIAL-HS-001', 1),
    ('Preview Protein Snack Bites', 'TRIAL-HS-002', 2),
    ('Preview Fruit & Veggie Chips', 'TRIAL-HS-003', 3)
  ) as item(name, sku, sort_order)
  where not exists (
    select 1 from public.products p
    where p.organization_id = p_organization_id
      and p.sku = item.sku
      and p.source = 'trade_show_trial_preview'
  );

  insert into public.product_variants (product_id, organization_id, name, sku_code, variant_code, pack_size_value, pack_size_unit, pack_label, units_per_case, moq_cases, pricing_mode_default, is_active, is_quoteable, sort_order, source_sheet_name, source_payload)
  select p.id, p.organization_id, 'Trial preview pack', coalesce(p.sku, 'TRIAL-PREVIEW'), coalesce(p.sku, 'TRIAL-PREVIEW'), 1, 'case', '1 case preview pack', 12, 10, 'case', true, true, coalesce(p.sort_order, 0), 'trade_show_trial_preview', jsonb_build_object('source','trade_show_trial_preview','preview_only',true)
  from public.products p
  where p.organization_id = p_organization_id
    and p.source = 'trade_show_trial_preview'
    and not exists (
      select 1 from public.product_variants v
      where v.product_id = p.id
        and v.source_sheet_name = 'trade_show_trial_preview'
    );

  select p.id, v.id into v_product_id, v_variant_id
  from public.products p
  join public.product_variants v on v.product_id = p.id and v.organization_id = p.organization_id
  where p.organization_id = p_organization_id
    and p.source = 'trade_show_trial_preview'
    and v.source_sheet_name = 'trade_show_trial_preview'
  order by p.sort_order asc nulls last, p.name asc
  limit 1;

  insert into public.documents (organization_id, related_entity, related_id, file_name, file_url, doc_type, version, status, version_label, requirement_code)
  select p_organization_id, 'lead', v_lead_id, item.file_name, item.file_url, item.doc_type, 1, 'approved', 'Preview', 'trade_show_trial_preview'
  from (values
    ('sample-commercial-quote.pdf','/preview/sample-commercial-quote.pdf','commercial_quote'),
    ('sample-proforma-invoice.pdf','/preview/sample-proforma-invoice.pdf','proforma_invoice'),
    ('sample-packing-list.pdf','/preview/sample-packing-list.pdf','packing_list')
  ) as item(file_name, file_url, doc_type)
  where not exists (
    select 1 from public.documents d
    where d.organization_id = p_organization_id
      and d.file_name = item.file_name
  );

  insert into public.quotes (organization_id, lead_id, created_by, status, currency, notes, quote_number, version_no, pricing_basis, display_currency, valid_until, country_id, source_type, approval_required, notes_internal, source_file_name, source_hash, lifecycle_outcome)
  select p_organization_id, v_lead_id, v_owner_user_id, 'sent', 'USD', 'Preview only.', 'TRIAL-Q-' || upper(substr(p_organization_id::text,1,6)), 1, 'fob', 'USD', current_date + interval '14 days', v_country_id, 'manual', false, 'source=trade_show_trial_preview; preview_only=true', 'trade_show_trial_preview_seed', md5(p_organization_id::text || 'trial_quote'), 'sent_follow_up'
  where not exists (
    select 1 from public.quotes q
    where q.organization_id = p_organization_id
      and q.source_file_name = 'trade_show_trial_preview_seed'
  )
  returning id into v_quote_id;

  if v_quote_id is null then
    select q.id into v_quote_id
    from public.quotes q
    where q.organization_id = p_organization_id
      and q.source_file_name = 'trade_show_trial_preview_seed'
    limit 1;
  end if;

  if v_quote_id is not null then
    insert into public.quote_versions (quote_id, version_no, status, pricing_basis, display_currency, valid_until, customer_message, internal_notes, sent_at, sent_by, approved_at, approved_by, total_line_count, created_by, source_file_name, source_hash)
    select v_quote_id, 1, 'sent', 'fob', 'USD', current_date + interval '14 days', 'Preview only.', 'preview_only=true', now() - interval '1 day', v_owner_user_id, now() - interval '1 day', v_owner_user_id, 1, v_owner_user_id, 'trade_show_trial_preview_seed', md5(v_quote_id::text || 'version')
    where not exists (
      select 1 from public.quote_versions qv
      where qv.quote_id = v_quote_id
        and qv.source_file_name = 'trade_show_trial_preview_seed'
    )
    returning id into v_version_id;

    if v_version_id is null then
      select qv.id into v_version_id
      from public.quote_versions qv
      where qv.quote_id = v_quote_id
        and qv.source_file_name = 'trade_show_trial_preview_seed'
      limit 1;
    end if;

    update public.quotes
    set current_version_id = v_version_id,
        sent_version_id = v_version_id,
        accepted_version_id = v_version_id,
        status = 'accepted',
        updated_at = now()
    where id = v_quote_id;

    if v_product_id is not null then
      insert into public.quote_line_items (quote_id, product_id, quantity, unit_price, currency, product_variant_id, catalog_price_amount, catalog_price_currency, is_price_overridden)
      select v_quote_id, v_product_id, 25, 32, 'USD', v_variant_id, 32, 'USD', false
      where not exists (
        select 1 from public.quote_line_items li
        where li.quote_id = v_quote_id
          and li.product_id = v_product_id
      );

      if v_version_id is not null then
        insert into public.quote_version_line_items (quote_version_id, product_id, product_variant_id, sku_code, product_name, category_type, pack_label, basis_applied, pricing_mode, units_per_case, moq, source_ex_factory_usd, source_fob_usd, final_unit_price, final_case_price, display_currency, sort_order)
        select v_version_id, p.id, v.id, coalesce(v.sku_code,p.sku,'TRIAL'), p.name, 'Health Snacks', coalesce(v.pack_label,'Trial pack'), 'fob', 'case', coalesce(v.units_per_case,12), coalesce(v.moq_cases,10), 24, 32, 2.67, 32, 'USD', 1
        from public.products p
        join public.product_variants v on v.product_id = p.id and v.organization_id = p.organization_id
        where p.id = v_product_id
          and v.id = v_variant_id
          and not exists (
            select 1 from public.quote_version_line_items li
            where li.quote_version_id = v_version_id
              and li.product_id = v_product_id
          );
      end if;
    end if;
  end if;

  insert into public.orders (organization_id, lead_id, source_quote_id, source_quote_version_id, order_number, order_type, current_stage, status, approval_state, currency, pricing_basis, incoterm, payment_terms, origin_place, destination_place, destination_port, buyer_reference, internal_notes, customer_notes, total_order_value, metadata, created_by, updated_by, order_lifecycle_status, payment_status, fulfillment_status, dispatch_status)
  select p_organization_id, v_lead_id, v_quote_id, v_version_id, 'TRIAL-O-' || upper(substr(p_organization_id::text,1,6)), 'export', 'internal_review', 'active', 'proforma_invoice_prepared', 'USD', 'fob', 'FOB', '50% advance / 50% before dispatch', 'Preview warehouse', 'Preview destination', 'Preview port', 'TRIAL-PO-PREVIEW', 'Preview only.', 'Preview only.', 800, jsonb_build_object('source','trade_show_trial_preview','is_preview',true), v_owner_user_id, v_owner_user_id, 'order_created', 'not_requested', 'not_started', 'not_ready'
  where v_quote_id is not null
    and v_version_id is not null
    and not exists (
      select 1 from public.orders o
      where o.organization_id = p_organization_id
        and o.metadata->>'source' = 'trade_show_trial_preview'
    )
  returning id into v_order_id;

  if v_order_id is null then
    select o.id into v_order_id
    from public.orders o
    where o.organization_id = p_organization_id
      and o.metadata->>'source' = 'trade_show_trial_preview'
    limit 1;
  end if;

  if v_order_id is not null and v_product_id is not null then
    insert into public.order_lines (organization_id, order_id, product_id, product_variant_id, product_category_id, product_name_snapshot, variant_name_snapshot, category_snapshot, sku_code, quoted_quantity, ordered_quantity, approved_quantity, unit_of_measure, unit_price, currency, line_total, line_status, change_type, pricing_snapshot, product_snapshot)
    select p_organization_id, v_order_id, p.id, v.id, p.category_id, p.name, coalesce(v.pack_label,'Trial pack'), 'Health Snacks', coalesce(v.sku_code,p.sku,'TRIAL'), 25, 25, 25, 'case', 32, 'USD', 800, 'confirmed', 'from_quote', jsonb_build_object('source','trade_show_trial_preview'), jsonb_build_object('source','trade_show_trial_preview')
    from public.products p
    join public.product_variants v on v.product_id = p.id and v.organization_id = p.organization_id
    where p.id = v_product_id
      and v.id = v_variant_id
      and not exists (
        select 1 from public.order_lines ol
        where ol.order_id = v_order_id
          and ol.product_id = v_product_id
      );

    for v_doc in
      select d.id, d.doc_type, d.file_url
      from public.documents d
      where d.organization_id = p_organization_id
        and d.requirement_code = 'trade_show_trial_preview'
    loop
      insert into public.order_documents (organization_id, order_id, document_id, document_type, stage_key, status, version_no, generated_from_snapshot, source_snapshot, pdf_storage_path)
      select p_organization_id, v_order_id, v_doc.id, v_doc.doc_type, case when v_doc.doc_type = 'packing_list' then 'packing' else 'finance' end, 'draft', 1, jsonb_build_object('source','trade_show_trial_preview'), jsonb_build_object('source','trade_show_trial_preview'), v_doc.file_url
      where not exists (
        select 1 from public.order_documents od
        where od.organization_id = p_organization_id
          and od.document_id = v_doc.id
      );
    end loop;
  end if;
end;
$$;

grant execute on function public.seed_trade_show_trial_preview_data(uuid) to authenticated;
grant execute on function public.seed_trade_show_trial_preview_data(uuid) to service_role;
