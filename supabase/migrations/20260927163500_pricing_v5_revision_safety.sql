-- Pricing V5 revision safety
-- Remove obsolete family-scoped uniqueness so published and draft revisions can coexist.
alter table public.packaging_size_profiles_v5
  drop constraint if exists packaging_size_profiles_v5_organization_id_family_id_size_k_key;
alter table public.packaging_constructions_v5
  drop constraint if exists packaging_constructions_v5_organization_id_family_id_constr_key;
alter table public.packaging_construction_layers_v5
  drop constraint if exists packaging_construction_layers_organization_id_construction__key;
