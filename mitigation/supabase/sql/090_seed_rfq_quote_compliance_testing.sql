-- Seed RFQ / quote / compliance / required-document demo data for testing.
-- Safe to re-run: inserts only when a first organization, lead, market, product, and variant exist.

do $$
declare
  v_org_id uuid;
  v_user_id uuid;
  v_market_id uuid;
  v_buyer_lead_id uuid;
  v_supplier_lead_id uuid;
  v_product_id uuid;
  v_variant_id uuid;
  v_price_id uuid;
  v_rfq_id uuid;
  v_quote_id uuid;
begin
  select id into v_org_id from public.organizations order by created_at asc limit 1;
  select id into v_user_id from public.profiles order by created_at asc limit 1;
  select id into v_market_id from public.markets where organization_id = v_org_id order by created_at asc limit 1;
  select id into v_buyer_lead_id from public.leads where organization_id = v_org_id and lead_type = 'buyer' order by created_at asc limit 1;
  select id into v_supplier_lead_id from public.leads where organization_id = v_org_id and lead_type = 'supplier' order by created_at asc limit 1;
  select p.id, pv.id
    into v_product_id, v_variant_id
  from public.products p
  join public.product_variants pv on pv.product_id = p.id
  where p.organization_id = v_org_id
  order by p.created_at asc
  limit 1;
  select id into v_price_id from public.product_prices where product_variant_id = v_variant_id order by effective_from desc limit 1;

  if v_org_id is null or v_market_id is null or v_buyer_lead_id is null or v_product_id is null or v_variant_id is null then
    raise notice 'Skipping seed because base organization/lead/product data is missing.';
    return;
  end if;

  insert into public.document_requirement_rules (organization_id, market_id, product_id, lead_type, progression_scope, requirement_code, title, doc_type, applies_to_entity)
  values
    (v_org_id, v_market_id, v_product_id, 'buyer', 'quote_send', 'COA', 'Certificate of Analysis', 'certificate', 'lead'),
    (v_org_id, v_market_id, v_product_id, 'buyer', 'quote_send', 'PACKING_LIST', 'Packing List', 'logistics', 'lead'),
    (v_org_id, v_market_id, v_product_id, 'buyer', 'contract_progression', 'SIGNED_SOW', 'Signed Statement of Work', 'contract', 'lead'),
    (v_org_id, v_market_id, v_product_id, 'supplier', 'general', 'SUPPLIER_PROFILE', 'Supplier Profile Pack', 'supplier_profile', 'lead')
  on conflict do nothing;

  insert into public.lead_markets (lead_id, market_id)
  values (v_buyer_lead_id, v_market_id)
  on conflict do nothing;

  insert into public.lead_product_interests (lead_id, product_id, label)
  values (v_buyer_lead_id, v_product_id, 'Seeded testing interest')
  on conflict do nothing;

  insert into public.documents (organization_id, related_entity, related_id, file_name, file_url, doc_type, uploaded_by, version, status, requirement_code, uploaded_at, reviewed_at, review_notes)
  values
    (v_org_id, 'lead', v_buyer_lead_id, 'coa-seed.pdf', 'https://example.com/coa-seed.pdf', 'certificate', v_user_id, 1, 'approved', 'COA', now() - interval '2 days', now() - interval '1 day', 'Seeded approved COA for quote-send testing'),
    (v_org_id, 'lead', v_buyer_lead_id, 'packing-list-seed.pdf', 'https://example.com/packing-list-seed.pdf', 'logistics', v_user_id, 1, 'submitted', 'PACKING_LIST', now() - interval '1 day', null, 'Seeded pending packing list for blocker testing'),
    (v_org_id, 'lead', v_buyer_lead_id, 'signed-sow-seed.pdf', 'https://example.com/sow-seed.pdf', 'contract', v_user_id, 1, 'submitted', 'SIGNED_SOW', now(), null, 'Seeded pending contract-progression document'),
    (v_org_id, 'lead', coalesce(v_supplier_lead_id, v_buyer_lead_id), 'supplier-profile-seed.pdf', 'https://example.com/supplier-profile.pdf', 'supplier_profile', v_user_id, 1, 'approved', 'SUPPLIER_PROFILE', now() - interval '3 days', now() - interval '2 days', 'Seeded supplier profile pack')
  on conflict do nothing;

  insert into public.lead_compliance_items (organization_id, lead_id, compliance_item_id, status, created_at, due_at, severity, blocked_stage, review_notes)
  select
    v_org_id,
    v_buyer_lead_id,
    c.id,
    'submitted',
    now() - interval '1 day',
    now() + interval '5 days',
    'high',
    'quote_send',
    'Seeded compliance item waiting review'
  from public.compliance_checklist_items c
  where c.id = (select id from public.compliance_checklist_items order by created_at asc limit 1)
    and not exists (
      select 1 from public.lead_compliance_items existing
      where existing.lead_id = v_buyer_lead_id and existing.compliance_item_id = c.id
    );

  insert into public.rfqs (organization_id, lead_id, created_by, status, validity_date, currency, notes)
  values (v_org_id, v_buyer_lead_id, v_user_id, 'submitted', current_date + 14, 'USD', 'Seeded RFQ for commercial testing')
  returning id into v_rfq_id;

  if v_rfq_id is not null then
    insert into public.rfq_line_items (rfq_id, product_id, product_variant_id, catalog_price_id, catalog_price_amount, catalog_price_currency, quantity, unit_price, currency, is_price_overridden, override_reason, overridden_by, overridden_at, notes)
    values (v_rfq_id, v_product_id, v_variant_id, v_price_id, 1250, 'USD', 10, 1225, 'USD', true, 'Seeded negotiation scenario', v_user_id, now() - interval '3 hours', 'Seeded RFQ line');
  end if;

  insert into public.quotes (organization_id, lead_id, rfq_id, created_by, status, currency, notes)
  values (v_org_id, v_buyer_lead_id, v_rfq_id, v_user_id, 'draft', 'USD', 'Seeded quote for quote-send blocker testing')
  returning id into v_quote_id;

  if v_quote_id is not null then
    insert into public.quote_line_items (quote_id, product_id, product_variant_id, catalog_price_id, catalog_price_amount, catalog_price_currency, quantity, unit_price, currency, is_price_overridden, override_reason, overridden_by, overridden_at, notes)
    values (v_quote_id, v_product_id, v_variant_id, v_price_id, 1250, 'USD', 10, 1200, 'USD', true, 'Seeded final commercial override', v_user_id, now() - interval '2 hours', 'Seeded quote line');
  end if;
end $$;