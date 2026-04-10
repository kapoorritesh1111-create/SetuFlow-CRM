-- 062_pricing_quote_engine_functions_and_triggers.sql
-- Purpose: add rerunnable helper functions and triggers for quote numbering,
-- updated_at maintenance, and parent-quote synchronization from version state.

begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.generate_quote_number(p_organization_id uuid)
returns text
language plpgsql
as $$
declare
  v_next integer;
begin
  select coalesce(
    max(
      case
        when quote_number is null then null
        when regexp_replace(quote_number, '[^0-9]', '', 'g') = '' then null
        else regexp_replace(quote_number, '[^0-9]', '', 'g')::integer
      end
    ),
    0
  ) + 1
  into v_next
  from public.quotes
  where organization_id = p_organization_id;

  return 'Q-' || lpad(v_next::text, 5, '0');
end;
$$;

create or replace function public.app_quote_before_insert_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.quote_number is null or btrim(new.quote_number) = '' then
    new.quote_number = public.generate_quote_number(new.organization_id);
  end if;

  if new.display_currency is null or btrim(new.display_currency) = '' then
    new.display_currency = coalesce(new.currency, 'USD');
  end if;

  if new.source_type is null or btrim(new.source_type) = '' then
    new.source_type = 'manual';
  end if;

  if new.valid_until is null then
    new.valid_until = (timezone('utc', now())::date + 7);
  end if;

  return new;
end;
$$;

create or replace function public.app_sync_quote_from_version()
returns trigger
language plpgsql
as $$
declare
  v_parent_status text;
begin
  if new.status in ('compiled', 'approved', 'sent', 'viewed', 'customer_countered', 'accepted') then
    update public.quotes
    set current_version_id = new.id,
        version_no = new.version_no,
        pricing_basis = new.pricing_basis,
        display_currency = new.display_currency,
        valid_until = coalesce(new.valid_until, valid_until),
        updated_at = now()
    where id = new.quote_id;
  end if;

  v_parent_status := case new.status
    when 'draft' then 'draft'
    when 'compiled' then 'in_review'
    when 'approval_pending' then 'in_review'
    when 'approved' then 'in_review'
    when 'sent' then 'sent'
    when 'viewed' then 'sent'
    when 'customer_countered' then 'negotiating'
    when 'accepted' then 'accepted'
    when 'rejected' then 'rejected'
    when 'expired' then 'expired'
    when 'cancelled' then 'cancelled'
    else null
  end;

  if v_parent_status is not null then
    update public.quotes
    set status = v_parent_status,
        accepted_version_id = case when new.status = 'accepted' then new.id else accepted_version_id end,
        updated_at = now()
    where id = new.quote_id;
  end if;

  return new;
end;
$$;

-- updated_at triggers

drop trigger if exists trg_quotes_set_updated_at on public.quotes;
create trigger trg_quotes_set_updated_at
before update on public.quotes
for each row
execute function public.set_updated_at();

drop trigger if exists trg_quote_versions_set_updated_at on public.quote_versions;
create trigger trg_quote_versions_set_updated_at
before update on public.quote_versions
for each row
execute function public.set_updated_at();

drop trigger if exists trg_product_pricing_rules_set_updated_at on public.product_pricing_rules;
create trigger trg_product_pricing_rules_set_updated_at
before update on public.product_pricing_rules
for each row
execute function public.set_updated_at();

drop trigger if exists trg_pricing_rule_sets_set_updated_at on public.pricing_rule_sets;
create trigger trg_pricing_rule_sets_set_updated_at
before update on public.pricing_rule_sets
for each row
execute function public.set_updated_at();

drop trigger if exists trg_freight_profiles_set_updated_at on public.freight_profiles;
create trigger trg_freight_profiles_set_updated_at
before update on public.freight_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_freight_profile_items_set_updated_at on public.freight_profile_items;
create trigger trg_freight_profile_items_set_updated_at
before update on public.freight_profile_items
for each row
execute function public.set_updated_at();

drop trigger if exists trg_freight_calc_assumptions_set_updated_at on public.freight_calc_assumptions;
create trigger trg_freight_calc_assumptions_set_updated_at
before update on public.freight_calc_assumptions
for each row
execute function public.set_updated_at();

drop trigger if exists trg_quote_templates_set_updated_at on public.quote_templates;
create trigger trg_quote_templates_set_updated_at
before update on public.quote_templates
for each row
execute function public.set_updated_at();

drop trigger if exists trg_pricing_engine_settings_set_updated_at on public.pricing_engine_settings;
create trigger trg_pricing_engine_settings_set_updated_at
before update on public.pricing_engine_settings
for each row
execute function public.set_updated_at();

-- quote defaulting trigger

drop trigger if exists trg_quotes_before_insert_defaults on public.quotes;
create trigger trg_quotes_before_insert_defaults
before insert on public.quotes
for each row
execute function public.app_quote_before_insert_defaults();

-- parent sync trigger

drop trigger if exists trg_quote_versions_sync_quote_from_version on public.quote_versions;
create trigger trg_quote_versions_sync_quote_from_version
after insert or update on public.quote_versions
for each row
execute function public.app_sync_quote_from_version();

commit;
