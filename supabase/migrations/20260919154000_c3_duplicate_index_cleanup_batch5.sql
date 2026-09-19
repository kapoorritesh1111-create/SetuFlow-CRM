-- C3 Batch 5: non-Pricing duplicate index/constraint cleanup.
drop index if exists public.idx_lead_compliance;
drop index if exists public.idx_lead_compliance_lead_item;
drop index if exists public.idx_lead_compliance_unique;

alter table public.pipelines
  drop constraint if exists pipelines_organization_id_name_key;

alter table public.product_categories
  drop constraint if exists product_categories_organization_id_name_key;
