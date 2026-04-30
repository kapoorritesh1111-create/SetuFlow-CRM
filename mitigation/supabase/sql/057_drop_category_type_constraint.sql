-- ═══════════════════════════════════════════════════════════════
-- Migration 057 (FINAL): Drop category_type CHECK constraint
--                        and make column nullable
-- ═══════════════════════════════════════════════════════════════
--
-- Affected tables (confirmed from live schema):
--   public.product_pricing_rules      — row 818 in schema
--   public.quote_version_line_items   — row 1039 in schema
--
-- What this migration does:
--   1. Drops the CHECK (category_type = ANY (ARRAY['chips','powders']))
--      constraint on both tables — categories are admin-managed, any name is valid
--   2. Makes category_type nullable — some inserts (e.g. seeded lines without
--      a catalog product) legitimately have no category
--   3. Backfills existing 'chips'/'powders' proxy values with real category
--      names from product_categories via the product join
--
-- SAFE TO RUN:
--   No rows deleted. No data lost.
--   Existing 'chips'/'powders' values are updated to real names where a
--   product link exists. Rows with no product_id keep their existing value.
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Drop CHECK constraint on product_pricing_rules ────────────
ALTER TABLE public.product_pricing_rules
  DROP CONSTRAINT IF EXISTS product_pricing_rules_category_type_check;

-- ── 2. Drop CHECK constraint on quote_version_line_items ─────────
ALTER TABLE public.quote_version_line_items
  DROP CONSTRAINT IF EXISTS quote_version_line_items_category_type_check;

-- ── 3. Safety net — catch any auto-generated constraint name variant ──
-- Postgres names inline CHECKs as {table}_{col}_check, but may append a
-- number suffix if the name was already taken. This catches all variants.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass AS tbl
    FROM pg_constraint
    WHERE contype = 'c'
      AND conrelid IN (
        'public.product_pricing_rules'::regclass,
        'public.quote_version_line_items'::regclass
      )
      AND pg_get_constraintdef(oid) LIKE '%category_type%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r.tbl, r.conname);
    RAISE NOTICE 'Dropped constraint % on %', r.conname, r.tbl;
  END LOOP;
END;
$$;

-- ── 4. Make category_type nullable on both tables ─────────────────
-- Some insert paths (e.g. lines seeded from lead product coverage without
-- a matched catalog rule) legitimately have no category. Making it nullable
-- is correct — category is display/grouping, not a required business field.
ALTER TABLE public.product_pricing_rules
  ALTER COLUMN category_type DROP NOT NULL;

ALTER TABLE public.quote_version_line_items
  ALTER COLUMN category_type DROP NOT NULL;

-- ── 5. Backfill: replace old proxy values with real category names ──
-- Updates rows still holding 'chips' or 'powders' to use the real name
-- from product_categories (e.g. "Vacuum-Cooked Chips", "Fruit Powders").
UPDATE public.product_pricing_rules ppr
SET category_type = pc.name
FROM public.products p
JOIN public.product_categories pc ON pc.id = p.category_id
WHERE ppr.product_id = p.id
  AND ppr.category_type IN ('chips', 'powders');

UPDATE public.quote_version_line_items qvli
SET category_type = pc.name
FROM public.products p
JOIN public.product_categories pc ON pc.id = p.category_id
WHERE qvli.product_id = p.id
  AND qvli.category_type IN ('chips', 'powders');

COMMIT;

-- ── Verify after running (should return 0 rows) ──────────────────
-- SELECT conname, conrelid::regclass
-- FROM pg_constraint
-- WHERE contype = 'c'
--   AND conrelid IN (
--     'public.product_pricing_rules'::regclass,
--     'public.quote_version_line_items'::regclass
--   )
--   AND pg_get_constraintdef(oid) LIKE '%category_type%';
