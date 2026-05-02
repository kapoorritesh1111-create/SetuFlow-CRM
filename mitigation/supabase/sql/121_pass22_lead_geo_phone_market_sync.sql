-- Pass 22 hotfix: lead country -> market and phone/WhatsApp sync
-- Purpose:
-- 1) Ensure app_refresh_lead_relations_tx writes organization_id on relation tables.
-- 2) Ensure leads.country_id/country always syncs leads.market_id and country phone code.
-- 3) Ensure lead_markets mirrors the country-derived market.
-- 4) Default WhatsApp to Phone when WhatsApp is blank.

create or replace function public.app_refresh_lead_relations_tx(
  p_organization_id uuid,
  p_lead_id uuid,
  p_market_ids uuid[] default '{}'::uuid[],
  p_product_ids uuid[] default '{}'::uuid[]
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_market_count integer := coalesce(array_length(p_market_ids, 1), 0);
  v_product_count integer := coalesce(array_length(p_product_ids, 1), 0);
  v_valid_market_count integer := 0;
  v_valid_product_count integer := 0;
begin
  perform 1
  from public.leads
  where id = p_lead_id
    and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'Lead not found for the active organization';
  end if;

  if v_market_count > 0 then
    select count(*)
    into v_valid_market_count
    from public.markets
    where organization_id = p_organization_id
      and id = any(p_market_ids);

    if v_valid_market_count <> v_market_count then
      raise exception 'One or more selected markets are not available in the active organization';
    end if;
  end if;

  if v_product_count > 0 then
    select count(*)
    into v_valid_product_count
    from public.products
    where organization_id = p_organization_id
      and id = any(p_product_ids);

    if v_valid_product_count <> v_product_count then
      raise exception 'One or more selected products are not available in the active organization';
    end if;
  end if;

  delete from public.lead_markets
  where lead_id = p_lead_id;

  if v_market_count > 0 then
    insert into public.lead_markets (organization_id, lead_id, market_id)
    select p_organization_id, p_lead_id, distinct_market_id
    from (
      select distinct unnest(p_market_ids) as distinct_market_id
    ) deduped
    where distinct_market_id is not null
    on conflict do nothing;
  end if;

  delete from public.lead_product_interests
  where lead_id = p_lead_id;

  if v_product_count > 0 then
    insert into public.lead_product_interests (organization_id, lead_id, product_id, interest_type, source_context)
    select p_organization_id, p_lead_id, distinct_product_id, 'confirmed_product', jsonb_build_object('source', 'lead_relation_refresh')
    from (
      select distinct unnest(p_product_ids) as distinct_product_id
    ) deduped
    where distinct_product_id is not null
    on conflict do nothing;
  end if;
end;
$$;

create or replace function public.sync_lead_geo_hierarchy()
returns trigger
language plpgsql
as $$
declare
  v_country record;
  v_count integer;
begin
  if new.country_id is not null then
    select c.id, c.name, c.market_id, c.phone_code
    into v_country
    from public.countries c
    where c.id = new.country_id
      and c.organization_id = new.organization_id;

    if found then
      new.country := v_country.name;
      new.market_id := v_country.market_id;
      if new.phone_country_code is null or btrim(new.phone_country_code) = '' then
        new.phone_country_code := v_country.phone_code;
      end if;
      if new.phone_secondary_country_code is null or btrim(new.phone_secondary_country_code) = '' then
        new.phone_secondary_country_code := v_country.phone_code;
      end if;
      if (new.phone is null or btrim(new.phone) = '') and v_country.phone_code is not null and btrim(v_country.phone_code) <> '' then
        new.phone := v_country.phone_code;
      end if;
      if new.whatsapp_number is null or btrim(new.whatsapp_number) = '' then
        new.whatsapp_number := new.phone;
      end if;
      return new;
    end if;
  end if;

  if new.country is not null and btrim(new.country) <> '' then
    select c.id, c.name, c.market_id, c.phone_code
    into v_country
    from public.countries c
    where c.organization_id = new.organization_id
      and lower(c.name) = lower(btrim(new.country))
    limit 1;

    if found then
      new.country_id := v_country.id;
      new.market_id := v_country.market_id;
      new.country := v_country.name;
      if new.phone_country_code is null or btrim(new.phone_country_code) = '' then
        new.phone_country_code := v_country.phone_code;
      end if;
      if new.phone_secondary_country_code is null or btrim(new.phone_secondary_country_code) = '' then
        new.phone_secondary_country_code := v_country.phone_code;
      end if;
      if (new.phone is null or btrim(new.phone) = '') and v_country.phone_code is not null and btrim(v_country.phone_code) <> '' then
        new.phone := v_country.phone_code;
      end if;
      if new.whatsapp_number is null or btrim(new.whatsapp_number) = '' then
        new.whatsapp_number := new.phone;
      end if;
      return new;
    end if;
  end if;

  if new.phone_country_code is not null and btrim(new.phone_country_code) <> '' then
    select count(*)
    into v_count
    from public.countries c
    where c.organization_id = new.organization_id
      and c.phone_code = btrim(new.phone_country_code);

    if v_count = 1 then
      select c.id, c.name, c.market_id, c.phone_code
      into v_country
      from public.countries c
      where c.organization_id = new.organization_id
        and c.phone_code = btrim(new.phone_country_code)
      limit 1;

      new.country_id := v_country.id;
      new.market_id := v_country.market_id;
      new.country := v_country.name;
    end if;
  end if;

  if new.whatsapp_number is null or btrim(new.whatsapp_number) = '' then
    new.whatsapp_number := new.phone;
  end if;

  return new;
end;
$$;

create or replace function public.sync_lead_primary_market_relation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.market_id is not null then
    insert into public.lead_markets (organization_id, lead_id, market_id)
    values (new.organization_id, new.id, new.market_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_lead_primary_market_relation on public.leads;
create trigger trg_sync_lead_primary_market_relation
after insert or update of market_id, country_id, country on public.leads
for each row
execute function public.sync_lead_primary_market_relation();

-- Backfill any existing leads missing country-derived phone/WhatsApp or market relation.
update public.leads l
set
  country_id = coalesce(l.country_id, c.id),
  market_id = coalesce(l.market_id, c.market_id),
  country = coalesce(nullif(btrim(l.country), ''), c.name),
  phone_country_code = coalesce(nullif(btrim(l.phone_country_code), ''), c.phone_code),
  phone_secondary_country_code = coalesce(nullif(btrim(l.phone_secondary_country_code), ''), c.phone_code),
  phone = case when l.phone is null or btrim(l.phone) = '' then c.phone_code else l.phone end,
  whatsapp_number = case when l.whatsapp_number is null or btrim(l.whatsapp_number) = '' then coalesce(nullif(btrim(l.phone), ''), c.phone_code) else l.whatsapp_number end
from public.countries c
where c.organization_id = l.organization_id
  and (
    (l.country_id is not null and c.id = l.country_id)
    or (l.country_id is null and l.country is not null and lower(c.name) = lower(btrim(l.country)))
  );

insert into public.lead_markets (organization_id, lead_id, market_id)
select l.organization_id, l.id, l.market_id
from public.leads l
where l.market_id is not null
on conflict do nothing;

-- Patch legacy lead upsert RPC so any remaining callers also satisfy organization-scoped relation tables.
create or replace function public.app_upsert_lead(
  p_organization_id uuid,
  p_lead_type text,
  p_company_name text,
  p_contact_name text,
  p_email text,
  p_phone text,
  p_country text,
  p_source_label text,
  p_stage_id uuid,
  p_next_step_id uuid,
  p_owner_user_id uuid,
  p_trade_event_id uuid,
  p_notes text,
  p_next_follow_up_at timestamp with time zone,
  p_updated_by uuid,
  p_created_by uuid,
  p_market_ids text[],
  p_product_ids text[]
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_lead_id uuid;
  v_market_id text;
  v_product_id text;
begin
  insert into public.leads (
    organization_id, lead_type, company_name, contact_name, email, phone, country,
    source_label, stage_id, next_step_id, owner_user_id, trade_event_id, notes,
    next_follow_up_at, updated_by, created_by
  ) values (
    p_organization_id, p_lead_type, p_company_name, nullif(p_contact_name,''), nullif(p_email,''), nullif(p_phone,''), nullif(p_country,''),
    nullif(p_source_label,''), p_stage_id, p_next_step_id, p_owner_user_id, p_trade_event_id, nullif(p_notes,''),
    p_next_follow_up_at, p_updated_by, p_created_by
  )
  returning id into v_lead_id;

  delete from public.lead_markets where lead_id = v_lead_id;
  foreach v_market_id in array coalesce(p_market_ids, array[]::text[]) loop
    insert into public.lead_markets (organization_id, lead_id, market_id)
    values (p_organization_id, v_lead_id, v_market_id::uuid)
    on conflict do nothing;
  end loop;

  delete from public.lead_product_interests where lead_id = v_lead_id;
  foreach v_product_id in array coalesce(p_product_ids, array[]::text[]) loop
    insert into public.lead_product_interests (organization_id, lead_id, product_id, interest_type, source_context)
    values (p_organization_id, v_lead_id, v_product_id::uuid, 'confirmed_product', jsonb_build_object('source', 'app_upsert_lead'))
    on conflict do nothing;
  end loop;

  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (
    p_organization_id,
    p_updated_by,
    'lead.upsert',
    'lead',
    v_lead_id,
    jsonb_build_object('company_name', p_company_name)
  );
end;
$$;
