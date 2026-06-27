create index if not exists organization_industry_profiles_org_idx on public.organization_industry_profiles(organization_id);
create index if not exists organization_industry_profiles_industry_idx on public.organization_industry_profiles(industry_key);
create index if not exists provisioning_templates_industry_type_idx on public.provisioning_templates(industry_key, template_type) where is_active;
create index if not exists organization_provisioning_state_org_idx on public.organization_provisioning_state(organization_id);
create index if not exists demo_seed_runs_org_idx on public.demo_seed_runs(organization_id);
create index if not exists products_industry_metadata_gin_idx on public.products using gin (industry_metadata);
create index if not exists leads_industry_metadata_gin_idx on public.leads using gin (industry_metadata);
create index if not exists quotes_industry_metadata_gin_idx on public.quotes using gin (industry_metadata);
