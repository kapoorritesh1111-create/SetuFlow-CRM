-- Sprint 50 final production hardening for Packaging Intelligence and Academy v7.

alter table public.ai_recommendations drop constraint if exists ai_recommendations_type_check;
alter table public.ai_recommendations add constraint ai_recommendations_type_check
check (
  recommendation_type = any (array[
    'lead_no_outreach'::text,
    'quote_no_follow_up'::text,
    'trade_event_lead_not_contacted'::text,
    'supplier_document_gap'::text,
    'buyer_quote_request'::text,
    'catalog_sent_no_reply'::text,
    'supplier_rfq_overdue'::text,
    'deal_stuck_in_stage'::text,
    'growth_outreach_follow_up'::text
  ]) or recommendation_type like 'packaging_%'
);

create or replace function public.set_packaging_academy_result_metadata()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.tested_route := coalesce(nullif(btrim(new.tested_route), ''), case new.workflow
    when 'Capture' then '/contact-exchange/scan'
    when 'Qualification' then '/leads'
    when 'Setu Guru for Packaging' then '/setu-guru-ai'
    when 'Growth Center — Packaging Operations' then '/growth-agent'
    when 'Quote Builder' then '/quotes'
    when 'Approvals & Sending' then '/approval-send'
    when 'Quote Management & Outcomes' then '/quotes'
    when 'Orders / Execution' then '/orders'
    when 'Design & Proofs' then '/design-queue'
    when 'Production & Dispatch' then '/dispatch-board'
    when 'Catalog & Packaging Pricing' then '/products'
    when 'Tasks' then '/tasks'
    when 'Trade Events' then '/trade-events'
    when 'Admin & Settings' then '/admin/organization'
    else '/academy'
  end);
  new.academy_version := coalesce(nullif(btrim(new.academy_version), ''), '2026.07.25-v7');
  return new;
end;
$$;

create or replace function public.scope_packaging_academy_sprint_issue()
returns trigger
language plpgsql
set search_path = public
as $$
declare v_route text;
begin
  if coalesce(new.submitted_via, '') <> 'Packaging Academy' then return new; end if;
  v_route := case new.workflow_area
    when 'Capture' then '/contact-exchange/scan'
    when 'Qualification' then '/leads'
    when 'Setu Guru for Packaging' then '/setu-guru-ai'
    when 'Growth Center — Packaging Operations' then '/growth-agent'
    when 'Quote Builder' then '/quotes'
    when 'Approvals & Sending' then '/approval-send'
    when 'Quote Management & Outcomes' then '/quotes'
    when 'Orders / Execution' then '/orders'
    when 'Design & Proofs' then '/design-queue'
    when 'Production & Dispatch' then '/dispatch-board'
    when 'Catalog & Packaging Pricing' then '/products'
    when 'Tasks' then '/tasks'
    when 'Trade Events' then '/trade-events'
    when 'Admin & Settings' then '/admin/organization'
    else coalesce(nullif(new.affected_route, ''), '/academy')
  end;
  new.affected_route := v_route;
  new.affected_module := coalesce(nullif(new.workflow_area, ''), 'Packaging Academy');
  if position(v_route in coalesce(new.steps_to_reproduce, '')) = 0 then
    new.steps_to_reproduce := concat('Open ', v_route, ' in the Packaging workspace. ', coalesce(new.steps_to_reproduce, 'Execute the recorded Academy step.'));
  end if;
  return new;
end;
$$;

update public.packaging_test_results r
set academy_version = '2026.07.25-v6',
    tested_route = case workflow
      when 'Capture' then '/contact-exchange/scan'
      when 'Qualification' then '/leads'
      when 'Quote Builder' then '/quotes'
      when 'Approvals & Sending' then '/approval-send'
      when 'Quote Management & Outcomes' then '/quotes'
      when 'Orders / Execution' then '/orders'
      when 'Design & Proofs' then '/design-queue'
      when 'Production & Dispatch' then '/dispatch-board'
      when 'Catalog & Packaging Pricing' then '/products'
      when 'Tasks' then '/tasks'
      when 'Trade Events' then '/trade-events'
      when 'Admin & Settings' then '/admin/organization'
      else '/academy'
    end,
    updated_at = now()
where r.organization_id in (select id from public.organizations where slug = 'packaging')
  and (r.academy_version is null or r.tested_route is null);

with eligible_quotes as (
  select q.id
  from public.quotes q
  join public.organizations o on o.id = q.organization_id
  where o.slug = 'packaging'
    and upper(o.default_currency) = 'INR'
    and q.status in ('draft','in_review')
    and upper(coalesce(q.display_currency,q.currency,'USD')) = 'USD'
    and exists (
      select 1 from public.quote_line_items qli
      where qli.quote_id = q.id and upper(coalesce(qli.currency, qli.catalog_price_currency, '')) = 'INR'
    )
    and not exists (
      select 1 from public.quote_line_items qli
      where qli.quote_id = q.id and coalesce(qli.is_price_overridden,false)
    )
)
update public.quotes q
set currency = 'INR', display_currency = 'INR', updated_at = now()
from eligible_quotes e
where q.id = e.id;

update public.quote_versions qv
set display_currency = 'INR', updated_at = now()
where qv.quote_id in (
  select q.id
  from public.quotes q
  join public.organizations o on o.id = q.organization_id
  where o.slug = 'packaging'
    and q.status in ('draft','in_review')
    and upper(coalesce(q.display_currency,q.currency)) = 'INR'
)
and upper(coalesce(qv.display_currency,'USD')) = 'USD';

insert into public.ai_recommendations (
  org_id, entity_type, entity_id, recommendation_type, title, summary, reason,
  recommended_action, action_href, priority, status, metadata
)
select
  q.organization_id, 'quote', q.id, 'packaging_job_not_started',
  'Accepted Packaging quote needs execution handoff',
  concat(coalesce(q.quote_number, 'Accepted quote'), ' has no canonical order.'),
  'The buyer outcome is Accepted, but no order exists for this source quote.',
  'Open the accepted quote and create or verify the governed order handoff.',
  concat('/quotes?quoteId=', q.id), 'high', 'open',
  jsonb_build_object('source','deterministic_rule','rule_version','s50-v1','quote_number',q.quote_number)
from public.quotes q
join public.organizations org on org.id = q.organization_id and org.slug = 'packaging'
where q.status = 'accepted'
  and not exists (select 1 from public.orders o where o.organization_id=q.organization_id and o.source_quote_id=q.id)
  and not exists (
    select 1 from public.ai_recommendations r
    where r.org_id=q.organization_id and r.recommendation_type='packaging_job_not_started'
      and r.entity_type='quote' and r.entity_id=q.id and r.status='open'
  );

insert into public.ai_recommendations (
  org_id, entity_type, entity_id, recommendation_type, title, summary, reason,
  recommended_action, action_href, priority, status, metadata
)
select
  t.organization_id, 'activity', t.id, 'packaging_pricing_template_unhealthy',
  'Review Packaging pricing template configuration',
  concat(t.name, ' is active but has incomplete pricing inputs.'),
  concat_ws(', ',
    case when coalesce(jsonb_array_length(case when jsonb_typeof(t.material_rates_json)='array' then t.material_rates_json else '[]'::jsonb end),0)=0 then 'material rates missing' end,
    case when coalesce(jsonb_array_length(case when jsonb_typeof(t.moq_tiers_json)='array' then t.moq_tiers_json else '[]'::jsonb end),0)=0 and coalesce(jsonb_array_length(coalesce(t.moq_tiers_json->'tiers','[]'::jsonb)),0)=0 then 'MOQ tiers missing' end
  ),
  'Open the template, complete the missing configuration and validate it with a controlled quote.',
  '/admin/packaging-templates', 'medium', 'open',
  jsonb_build_object('source','deterministic_rule','rule_version','s50-v1','template_id',t.id,'template_name',t.name)
from public.packaging_pricing_templates t
join public.organizations org on org.id = t.organization_id and org.slug = 'packaging'
where t.is_active
  and (
    coalesce(jsonb_array_length(case when jsonb_typeof(t.material_rates_json)='array' then t.material_rates_json else '[]'::jsonb end),0)=0
    or (coalesce(jsonb_array_length(case when jsonb_typeof(t.moq_tiers_json)='array' then t.moq_tiers_json else '[]'::jsonb end),0)=0 and coalesce(jsonb_array_length(coalesce(t.moq_tiers_json->'tiers','[]'::jsonb)),0)=0)
  )
  and not exists (
    select 1 from public.ai_recommendations r
    where r.org_id=t.organization_id and r.recommendation_type='packaging_pricing_template_unhealthy'
      and r.entity_type='activity' and r.entity_id=t.id and r.status='open'
  );

update public.sprint_issues
set status='In Review',
    qa_notes=concat_ws(E'\n', qa_notes, 'Legacy editable Packaging quotes with INR line truth were normalized to INR on 2026-07-25. Requires a fresh Academy v7 Approval & Sending retest before resolution.'),
    updated_at=now()
where issue_ref='S49-PKG-001';
