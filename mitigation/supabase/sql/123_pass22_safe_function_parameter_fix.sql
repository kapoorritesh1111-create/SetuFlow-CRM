-- SETU Flow CRM - Pass 22 safe mitigation after app_upsert_lead parameter-name error
-- Purpose: apply ONLY country -> market, phone/WhatsApp defaulting, and lead relation fixes.
-- This script intentionally does NOT create ai_suggestions or any already-existing application table.
-- It also preserves the existing app_upsert_lead input parameter names to avoid PostgreSQL 42P13.

begin;

-- 1) Keep lead geo fields and phone defaults synced from selected country.
create or replace function public.sync_lead_geo_hierarchy()
returns trigger
language plpgsql
as $function$
declare
  v_country record;
  v_count integer;
begin
  -- Case 1: explicit country_id entered.
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

      if (new.whatsapp_number is null or btrim(new.whatsapp_number) = '') and new.phone is not null and btrim(new.phone) <> '' then
        new.whatsapp_number := new.phone;
      end if;

      return new;
    end if;
  end if;

  -- Case 2: country text entered.
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

      if (new.whatsapp_number is null or btrim(new.whatsapp_number) = '') and new.phone is not null and btrim(new.phone) <> '' then
        new.whatsapp_number := new.phone;
      end if;

      return new;
    end if;
  end if;

  -- Case 3: phone code entered first. Only auto-fill country if code maps to exactly one country in the org.
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

      if (new.phone is null or btrim(new.phone) = '') and v_country.phone_code is not null and btrim(v_country.phone_code) <> '' then
        new.phone := v_country.phone_code;
      end if;

      if (new.whatsapp_number is null or btrim(new.whatsapp_number) = '') and new.phone is not null and btrim(new.phone) <> '' then
        new.whatsapp_number := new.phone;
      end if;

      return new;
    end if;
  end if;

  if (new.whatsapp_number is null or btrim(new.whatsapp_number) = '') and new.phone is not null and btrim(new.phone) <> '' then
    new.whatsapp_number := new.phone;
  end if;

  return new;
end;
$function$;

-- Ensure the existing trigger exists and points to the refreshed function.
drop trigger if exists leads_sync_geo_hierarchy on public.leads;
create trigger leads_sync_geo_hierarchy
before insert or update on public.leads
for each row execute function public.sync_lead_geo_hierarchy();

-- 2) Ensure lead_markets always has the current lead market relation after leads insert/update.
create or replace function public.sync_lead_market_relation()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if new.market_id is not null then
    insert into public.lead_markets (organization_id, lead_id, market_id)
    values (new.organization_id, new.id, new.market_id)
    on conflict (lead_id, market_id) do update
      set organization_id = excluded.organization_id;
  end if;

  return new;
end;
$function$;

drop trigger if exists leads_sync_market_relation on public.leads;
create trigger leads_sync_market_relation
after insert or update of organization_id, market_id on public.leads
for each row execute function public.sync_lead_market_relation();

-- 3) Fix app_refresh_lead_relations_tx so relation rows include organization_id.
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
as $function$
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
    select count(*) into v_valid_market_count
    from public.markets
    where organization_id = p_organization_id
      and id = any(p_market_ids);

    if v_valid_market_count <> v_market_count then
      raise exception 'One or more selected markets are not available in the active organization';
    end if;
  end if;

  if v_product_count > 0 then
    select count(*) into v_valid_product_count
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
    on conflict (lead_id, market_id) do update
      set organization_id = excluded.organization_id;
  end if;

  delete from public.lead_product_interests
  where lead_id = p_lead_id;

  if v_product_count > 0 then
    insert into public.lead_product_interests (organization_id, lead_id, product_id)
    select p_organization_id, p_lead_id, distinct_product_id
    from (
      select distinct unnest(p_product_ids) as distinct_product_id
    ) deduped
    where distinct_product_id is not null;
  end if;
end;
$function$;

-- 4) Fix legacy app_upsert_lead while preserving exact existing input parameter names.
-- PostgreSQL does not allow changing input parameter names with CREATE OR REPLACE.
create or replace function public.app_upsert_lead(
  organization_id uuid,
  lead_type text,
  company_name text,
  contact_name text,
  email text,
  phone text,
  country text,
  source_label text,
  stage_id uuid,
  next_step_id uuid,
  owner_user_id uuid,
  trade_event_id uuid,
  notes text,
  next_follow_up_at timestamp with time zone,
  updated_by uuid,
  created_by uuid,
  market_ids text[],
  product_ids text[]
)
returns void
language plpgsql
security definer
as $function$
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
    organization_id, lead_type::public.lead_type, company_name, nullif(contact_name,''), nullif(email,''), nullif(phone,''), nullif(country,''),
    nullif(source_label,''), stage_id, next_step_id, owner_user_id, trade_event_id, nullif(notes,''),
    next_follow_up_at, updated_by, created_by
  )
  returning id into v_lead_id;

  delete from public.lead_markets where lead_id = v_lead_id;
  foreach v_market_id in array coalesce(market_ids, array[]::text[]) loop
    insert into public.lead_markets (organization_id, lead_id, market_id)
    values (organization_id, v_lead_id, v_market_id::uuid)
    on conflict (lead_id, market_id) do update
      set organization_id = excluded.organization_id;
  end loop;

  delete from public.lead_product_interests where lead_id = v_lead_id;
  foreach v_product_id in array coalesce(product_ids, array[]::text[]) loop
    insert into public.lead_product_interests (organization_id, lead_id, product_id)
    values (organization_id, v_lead_id, v_product_id::uuid);
  end loop;

  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (
    organization_id,
    updated_by,
    'lead.upsert',
    'lead',
    v_lead_id,
    jsonb_build_object('company_name', company_name)
  );
end;
$function$;

-- 5) Backfill existing data safely.
update public.leads l
set
  country_id = coalesce(l.country_id, c.id),
  market_id = coalesce(l.market_id, c.market_id),
  country = coalesce(nullif(btrim(l.country), ''), c.name),
  phone_country_code = coalesce(nullif(btrim(l.phone_country_code), ''), c.phone_code),
  phone = case
    when nullif(btrim(coalesce(l.phone, '')), '') is null then c.phone_code
    else l.phone
  end,
  whatsapp_number = case
    when nullif(btrim(coalesce(l.whatsapp_number, '')), '') is null then coalesce(nullif(btrim(l.phone), ''), c.phone_code)
    else l.whatsapp_number
  end
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
on conflict (lead_id, market_id) do update
  set organization_id = excluded.organization_id;

commit;
