-- S34-CATALOG-002: export-ready product fields (APPLIED LIVE via Supabase MCP)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS certifications text[],
  ADD COLUMN IF NOT EXISTS shelf_life text,
  ADD COLUMN IF NOT EXISTS storage_condition text,
  ADD COLUMN IF NOT EXISTS country_of_origin text,
  ADD COLUMN IF NOT EXISTS carton_config text,
  ADD COLUMN IF NOT EXISTS private_label_available boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS lead_time_days integer,
  ADD COLUMN IF NOT EXISTS spec_sheet_url text,
  ADD COLUMN IF NOT EXISTS ingredients text;
