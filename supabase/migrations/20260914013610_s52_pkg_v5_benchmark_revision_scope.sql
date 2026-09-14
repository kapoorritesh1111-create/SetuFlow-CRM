-- S52-PKG-V5-009
-- Keep competitor observations tied to the exact Pricing v5 revision used for comparison.
begin;

alter table public.packaging_pricing_competitor_benchmarks_v5
  add column if not exists template_id uuid;

update public.packaging_pricing_competitor_benchmarks_v5 b
set template_id=s.template_id
from public.packaging_size_profiles_v5 s
where b.template_id is null
  and s.organization_id=b.organization_id
  and s.id=b.size_profile_id;

do $$
begin
  if exists(select 1 from public.packaging_pricing_competitor_benchmarks_v5 where template_id is null) then
    raise exception 'Cannot scope Pricing v5 competitor benchmarks: unresolved template revision rows exist.';
  end if;
end $$;

alter table public.packaging_pricing_competitor_benchmarks_v5
  alter column template_id set not null;

alter table public.packaging_pricing_competitor_benchmarks_v5
  add constraint packaging_pricing_comp_benchmark_template_org_fkey
  foreign key (organization_id,template_id)
  references public.packaging_pricing_templates(organization_id,id) on delete cascade;

create index if not exists idx_packaging_pricing_comp_benchmark_template
  on public.packaging_pricing_competitor_benchmarks_v5(organization_id,template_id,size_profile_id,construction_id,quantity,observed_at desc);

create or replace function public.guard_packaging_v5_benchmark_revision()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  if not exists(
    select 1 from public.packaging_size_profiles_v5 s
    where s.id=new.size_profile_id
      and s.organization_id=new.organization_id
      and s.template_id=new.template_id
      and s.family_id=new.family_id
  ) then
    raise exception 'Pricing v5 benchmark size does not belong to the selected template revision';
  end if;
  if new.construction_id is not null and not exists(
    select 1 from public.packaging_constructions_v5 c
    where c.id=new.construction_id
      and c.organization_id=new.organization_id
      and c.template_id=new.template_id
      and c.family_id=new.family_id
  ) then
    raise exception 'Pricing v5 benchmark construction does not belong to the selected template revision';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_packaging_v5_benchmark_revision on public.packaging_pricing_competitor_benchmarks_v5;
create trigger trg_guard_packaging_v5_benchmark_revision
before insert or update of template_id,family_id,size_profile_id,construction_id
on public.packaging_pricing_competitor_benchmarks_v5
for each row execute function public.guard_packaging_v5_benchmark_revision();

commit;
