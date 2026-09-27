-- Pricing V5 self-service commercial groups.
alter table public.packaging_size_profiles_v5 drop constraint if exists packaging_size_profiles_v5_pricing_bucket_check;
alter table public.packaging_size_profiles_v5 add constraint packaging_size_profiles_v5_pricing_bucket_check check (pricing_bucket >= 1 and pricing_bucket <= 99);
alter table public.packaging_pricing_commercial_bands_v5 drop constraint if exists packaging_pricing_commercial_bands_v5_pricing_bucket_check;
alter table public.packaging_pricing_commercial_bands_v5 add constraint packaging_pricing_commercial_bands_v5_pricing_bucket_check check (pricing_bucket >= 1 and pricing_bucket <= 99);
