alter table public.organization_industry_profiles enable row level security;
alter table public.provisioning_templates enable row level security;
alter table public.organization_provisioning_state enable row level security;
alter table public.demo_seed_runs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='organization_industry_profiles' and policyname='organization_industry_profiles_service_all') then
    create policy organization_industry_profiles_service_all on public.organization_industry_profiles for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='provisioning_templates' and policyname='provisioning_templates_service_all') then
    create policy provisioning_templates_service_all on public.provisioning_templates for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='organization_provisioning_state' and policyname='organization_provisioning_state_service_all') then
    create policy organization_provisioning_state_service_all on public.organization_provisioning_state for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='demo_seed_runs' and policyname='demo_seed_runs_service_all') then
    create policy demo_seed_runs_service_all on public.demo_seed_runs for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='provisioning_templates' and policyname='provisioning_templates_authenticated_read') then
    create policy provisioning_templates_authenticated_read on public.provisioning_templates for select to authenticated using (is_active = true);
  end if;
end $$;
