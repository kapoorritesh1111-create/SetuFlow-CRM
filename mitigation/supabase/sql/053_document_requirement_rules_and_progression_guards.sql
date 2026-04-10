-- Phase 6.2 / 6.3: normalize required-document rules and add contract progression guards.

create table if not exists public.document_requirement_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  market_id uuid null references public.markets(id) on delete cascade,
  product_id uuid null references public.products(id) on delete cascade,
  lead_type text null,
  progression_scope text not null default 'general',
  requirement_code text not null,
  title text null,
  doc_type text null,
  applies_to_entity text not null default 'lead',
  is_mandatory boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists document_requirement_rules_org_scope_idx
  on public.document_requirement_rules (organization_id, progression_scope, is_active, lead_type);

create index if not exists document_requirement_rules_org_market_idx
  on public.document_requirement_rules (organization_id, market_id, product_id);

create unique index if not exists document_requirement_rules_unique_active_idx
  on public.document_requirement_rules (
    organization_id,
    coalesce(market_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(lead_type, ''),
    progression_scope,
    requirement_code
  );

create or replace function public.app_contract_progression_blocker_count(p_organization_id uuid, p_lead_id uuid)
returns integer
language plpgsql
as $$
declare
  v_lead_type text;
  v_missing_count integer := 0;
  v_open_compliance_count integer := 0;
begin
  select lead_type into v_lead_type from public.leads where id = p_lead_id and organization_id = p_organization_id;

  if v_lead_type is null then
    return 0;
  end if;

  with lead_market_ids as (
    select market_id from public.lead_markets where lead_id = p_lead_id
  ),
  lead_product_ids as (
    select product_id from public.lead_product_interests where lead_id = p_lead_id
  ),
  applicable_rules as (
    select distinct r.requirement_code
    from public.document_requirement_rules r
    where r.organization_id = p_organization_id
      and r.is_active = true
      and r.progression_scope in ('general', 'contract_progression')
      and (r.lead_type is null or lower(r.lead_type) = lower(v_lead_type))
      and (r.market_id is null or r.market_id in (select market_id from lead_market_ids))
      and (r.product_id is null or r.product_id in (select product_id from lead_product_ids))
  ),
  approved_documents as (
    select distinct d.requirement_code
    from public.documents d
    where d.organization_id = p_organization_id
      and d.related_entity = 'lead'
      and d.related_id = p_lead_id
      and d.requirement_code is not null
      and lower(coalesce(d.status, '')) in ('approved', 'complete', 'completed', 'ready')
      and (d.expires_at is null or d.expires_at >= current_date)
  )
  select count(*)
    into v_missing_count
  from applicable_rules r
  left join approved_documents d on d.requirement_code = r.requirement_code
  where d.requirement_code is null;

  select count(*)
    into v_open_compliance_count
  from public.lead_compliance_items c
  where c.organization_id = p_organization_id
    and c.lead_id = p_lead_id
    and lower(coalesce(c.status, '')) not in ('approved', 'waived', 'complete', 'completed');

  return coalesce(v_missing_count, 0) + coalesce(v_open_compliance_count, 0);
end;
$$;

create or replace function public.app_assert_contract_progression_ready()
returns trigger
language plpgsql
as $$
begin
  if lower(coalesce(new.status, '')) in ('active', 'signed', 'executed') then
    if public.app_contract_progression_blocker_count(new.organization_id, new.lead_id) > 0 then
      raise exception 'Contract progression is blocked until required documents and compliance items are resolved.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_app_assert_contract_progression_ready on public.contracts;
create trigger trg_app_assert_contract_progression_ready
before insert or update on public.contracts
for each row
execute function public.app_assert_contract_progression_ready();
