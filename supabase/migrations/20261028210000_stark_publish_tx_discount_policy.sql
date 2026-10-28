begin;
create table if not exists public.stark_pricing_discount_policy (
 organization_id uuid primary key references public.organizations(id) on delete cascade,
 approval_threshold_percent numeric(6,2) not null default 15 check (approval_threshold_percent>=0 and approval_threshold_percent<100),
 updated_by uuid,updated_at timestamptz not null default now()
);
alter table public.stark_pricing_discount_policy enable row level security;
revoke all on public.stark_pricing_discount_policy from anon,authenticated;
grant all on public.stark_pricing_discount_policy to service_role;
create or replace function public.app_publish_packaging_template_v5_tx(p_org uuid,p_template uuid,p_actor uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.packaging_pricing_templates%rowtype; prior public.packaging_pricing_templates%rowtype;
begin
 select * into v from public.packaging_pricing_templates where id=p_template and organization_id=p_org and status='draft' and calculation_version=5 for update;
 if not found then raise exception 'Pricing V5 draft not found'; end if;
 if v.supersedes_template_id is not null then
   select * into prior from public.packaging_pricing_templates where id=v.supersedes_template_id and organization_id=p_org for update;
   if not found then raise exception 'Previous pricing revision was not found'; end if;
   if prior.family_id is distinct from v.family_id or prior.calculation_engine_key is distinct from v.calculation_engine_key then
     raise exception 'Pricing revision family/engine mismatch';
   end if;
   update public.packaging_pricing_templates set status='archived',is_active=false,updated_at=now()
   where id=prior.id and organization_id=p_org;
 end if;
 update public.packaging_pricing_templates set status='published',is_active=true,published_at=now(),published_by=p_actor,updated_at=now()
 where id=p_template and organization_id=p_org and status='draft';
 if not found then raise exception 'Pricing V5 draft changed during publishing'; end if;
 return p_template;
end $$;
revoke all on function public.app_publish_packaging_template_v5_tx(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.app_publish_packaging_template_v5_tx(uuid,uuid,uuid) to service_role;
commit;