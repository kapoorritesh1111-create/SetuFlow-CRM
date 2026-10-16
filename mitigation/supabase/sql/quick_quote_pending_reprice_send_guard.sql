-- Safety gate for Quick Quote transfers. Required before enabling conversion.
-- Both the quote lifecycle and its current version must reject send while any
-- transferred Quick Quote line remains pending a governed V5 reprice.
create or replace function public.app_block_unpriced_quick_quote_send()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_quote_id uuid;
begin
  if TG_TABLE_NAME='quotes' then
    if NEW.status not in ('sent','negotiating','accepted') then return NEW; end if;
    v_quote_id := NEW.id;
  elsif TG_TABLE_NAME='quote_versions' then
    if NEW.status not in ('sent','approved') then return NEW; end if;
    v_quote_id := NEW.quote_id;
  else
    return NEW;
  end if;
  if exists (
    select 1 from public.quote_line_items li
    where li.quote_id=v_quote_id
      and li.input_snapshot_json->>'source'='quick_quote_pending_reprice'
  ) then
    raise exception 'Quick Quote lines require a validated V5 reprice before approval or sending';
  end if;
  return NEW;
end;
$$;
drop trigger if exists trg_block_unpriced_quick_quote_send on public.quotes;
create trigger trg_block_unpriced_quick_quote_send
  before insert or update of status on public.quotes
  for each row execute function public.app_block_unpriced_quick_quote_send();
drop trigger if exists trg_block_unpriced_quick_quote_version_send on public.quote_versions;
create trigger trg_block_unpriced_quick_quote_version_send
  before insert or update of status on public.quote_versions
  for each row execute function public.app_block_unpriced_quick_quote_send();
