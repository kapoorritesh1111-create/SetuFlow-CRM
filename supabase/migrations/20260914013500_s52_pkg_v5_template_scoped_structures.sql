-- S52-PKG-V5-007
-- Make Pricing v5 sizes/constructions/layers revision-safe by scoping structure to a template.
-- This preserves published revisions when a new draft is cloned and edited.
begin;

alter table public.packaging_size_profiles_v5 add column if not exists template_id uuid;
alter table public.packaging_constructions_v5 add column if not exists template_id uuid;
alter table public.packaging_construction_layers_v5 add column if not exists template_id uuid;

update public.packaging_size_profiles_v5 s
set template_id=t.id
from public.packaging_pricing_templates t
where s.template_id is null
  and t.organization_id=s.organization_id
  and t.family_id=s.family_id
  and t.calculation_version=5
  and t.calculation_engine_key='sup_formula_v5';

update public.packaging_constructions_v5 c
set template_id=t.id
from public.packaging_pricing_templates t
where c.template_id is null
  and t.organization_id=c.organization_id
  and t.family_id=c.family_id
  and t.calculation_version=5
  and t.calculation_engine_key='sup_formula_v5';

update public.packaging_construction_layers_v5 l
set template_id=c.template_id
from public.packaging_constructions_v5 c
where l.template_id is null
  and c.organization_id=l.organization_id
  and c.id=l.construction_id;

do $$
begin
  if exists(select 1 from public.packaging_size_profiles_v5 where template_id is null) then
    raise exception 'Cannot scope Pricing v5 sizes: unresolved template_id rows exist.';
  end if;
  if exists(select 1 from public.packaging_constructions_v5 where template_id is null) then
    raise exception 'Cannot scope Pricing v5 constructions: unresolved template_id rows exist.';
  end if;
  if exists(select 1 from public.packaging_construction_layers_v5 where template_id is null) then
    raise exception 'Cannot scope Pricing v5 construction layers: unresolved template_id rows exist.';
  end if;
end $$;

alter table public.packaging_size_profiles_v5 alter column template_id set not null;
alter table public.packaging_constructions_v5 alter column template_id set not null;
alter table public.packaging_construction_layers_v5 alter column template_id set not null;

alter table public.packaging_size_profiles_v5
  add constraint packaging_size_profiles_v5_template_org_fkey
  foreign key (organization_id,template_id) references public.packaging_pricing_templates(organization_id,id) on delete cascade;
alter table public.packaging_constructions_v5
  add constraint packaging_constructions_v5_template_org_fkey
  foreign key (organization_id,template_id) references public.packaging_pricing_templates(organization_id,id) on delete cascade;
alter table public.packaging_construction_layers_v5
  add constraint packaging_construction_layers_v5_template_org_fkey
  foreign key (organization_id,template_id) references public.packaging_pricing_templates(organization_id,id) on delete cascade;

alter table public.packaging_size_profiles_v5
  drop constraint if exists packaging_size_profiles_v5_organization_id_family_id_size_key_key;
alter table public.packaging_constructions_v5
  drop constraint if exists packaging_constructions_v5_organization_id_family_id_construction_key_key;
alter table public.packaging_construction_layers_v5
  drop constraint if exists packaging_construction_layers_v5_organization_id_construction_id_layer_position_key;

alter table public.packaging_size_profiles_v5
  add constraint packaging_size_profiles_v5_template_size_key unique(organization_id,template_id,size_key);
alter table public.packaging_constructions_v5
  add constraint packaging_constructions_v5_template_construction_key unique(organization_id,template_id,construction_key);
alter table public.packaging_construction_layers_v5
  add constraint packaging_construction_layers_v5_template_layer_position unique(organization_id,template_id,construction_id,layer_position);

create index if not exists idx_packaging_size_profiles_v5_template
  on public.packaging_size_profiles_v5(organization_id,template_id,is_active,sort_order);
create index if not exists idx_packaging_constructions_v5_template
  on public.packaging_constructions_v5(organization_id,template_id,is_active,sort_order);
create index if not exists idx_packaging_construction_layers_v5_template
  on public.packaging_construction_layers_v5(organization_id,template_id,construction_id,layer_position);

commit;
