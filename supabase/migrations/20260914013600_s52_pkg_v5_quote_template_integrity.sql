-- S52-PKG-V5-008
-- Prevent a Pricing v5 quote line from pairing a size from one revision with a different template revision.
begin;

create or replace function public.guard_packaging_v5_quote_template_size()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  if new.calculation_version=5
     and new.packaging_size_profile_v5_id is not null
     and new.packaging_template_id is not null
     and not exists(
       select 1
       from public.packaging_size_profiles_v5 s
       where s.id=new.packaging_size_profile_v5_id
         and s.template_id=new.packaging_template_id
         and s.family_id=new.packaging_family_id
     )
  then
    raise exception 'Pricing v5 size does not belong to the selected template revision';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_packaging_v5_quote_template_size on public.quote_line_items;
create trigger trg_guard_packaging_v5_quote_template_size
before insert or update of packaging_template_id,packaging_size_profile_v5_id,packaging_family_id,calculation_version
on public.quote_line_items
for each row execute function public.guard_packaging_v5_quote_template_size();

comment on function public.guard_packaging_v5_quote_template_size() is
  'Pricing v5 integrity guard: quote size, service family and pricing template must come from the same immutable revision.';

commit;
