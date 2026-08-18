create or replace function public.apply_org_currency_to_new_quote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_default_currency text;
begin
  select upper(nullif(btrim(o.default_currency), ''))
    into v_default_currency
  from public.organizations o
  where o.id = new.organization_id;

  if new.source_type = 'lead' and v_default_currency is not null then
    if coalesce(nullif(btrim(new.currency), ''), 'USD') = 'USD' then
      new.currency := v_default_currency;
    end if;
    if coalesce(nullif(btrim(new.display_currency), ''), 'USD') = 'USD' then
      new.display_currency := v_default_currency;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists apply_org_currency_to_new_quote_trigger on public.quotes;
create trigger apply_org_currency_to_new_quote_trigger
before insert on public.quotes
for each row
execute function public.apply_org_currency_to_new_quote();

create or replace function public.apply_quote_currency_to_new_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote_currency text;
begin
  select upper(coalesce(nullif(btrim(q.display_currency), ''), nullif(btrim(q.currency), ''), 'USD'))
    into v_quote_currency
  from public.quotes q
  where q.id = new.quote_id;

  if v_quote_currency is not null
     and coalesce(nullif(btrim(new.display_currency), ''), 'USD') = 'USD' then
    new.display_currency := v_quote_currency;
  end if;

  return new;
end;
$$;

drop trigger if exists apply_quote_currency_to_new_version_trigger on public.quote_versions;
create trigger apply_quote_currency_to_new_version_trigger
before insert on public.quote_versions
for each row
execute function public.apply_quote_currency_to_new_version();
