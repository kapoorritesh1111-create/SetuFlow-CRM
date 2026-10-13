-- Defense in depth: disallow sending a Stark copied quote until repriced lines
-- are reflected in BOTH the live quote lines and its customer version snapshot.
-- Only revision-marked quotes are affected.
begin;
create or replace function public.app_guard_stark_revision_send()
returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_org uuid;
  v_meta jsonb;
begin
  if lower(coalesce(new.status,'')) not in ('sent','accepted') then
    return new;
  end if;
  if lower(coalesce(old.status,''))=lower(coalesce(new.status,'')) then
    return new;
  end if;
  select organization_id,industry_metadata into v_org,v_meta
  from public.quotes where id=new.quote_id;
  if v_org is distinct from 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
     or coalesce(v_meta->>'revision_reprice_required','false') <> 'true' then
    return new;
  end if;
  if not exists(select 1 from public.quote_line_items where quote_id=new.quote_id)
     or exists(select 1 from public.quote_line_items
       where quote_id=new.quote_id and (coalesce(unit_price,0)<=0 or coalesce(quantity,0)<=0)) then
    raise exception 'Revised quote has unpriced product lines; recalculate before sending';
  end if;
  if not exists(select 1 from public.quote_version_line_items where quote_version_id=new.id)
     or exists(select 1 from public.quote_version_line_items
       where quote_version_id=new.id and coalesce(final_unit_price,0)<=0) then
    raise exception 'Revised quote version has unpriced lines; recalculate and review before sending';
  end if;
  return new;
end;$$;
drop trigger if exists trg_guard_stark_revision_send on public.quote_versions;
create trigger trg_guard_stark_revision_send
before update of status on public.quote_versions
for each row execute function public.app_guard_stark_revision_send();
commit;