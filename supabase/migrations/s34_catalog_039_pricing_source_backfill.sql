-- S34-CATALOG-039 mitigation: reconcile flat product price columns with the
-- canonical pricing engine (product_pricing_rules).
--
-- The flat products.fob_price / exw_price columns were a stale, mixed-unit
-- snapshot: some products had NULL flat prices despite having real pricing rules
-- (showing "Missing Price" in catalog/price-list surfaces), and some held a
-- per-case figure where the rest of the app expects per-unit (e.g. Banana Chips
-- fob_price = 110 vs canonical per-unit FOB 1.75). The application now reads
-- pricing through resolveProductPricing(), but this backfill makes the flat
-- columns self-consistent so any remaining/legacy reader is also correct.
--
-- Safe + idempotent: reads from rules, writes only flat columns on products.
-- Re-running converges to the same values.

WITH best AS (
  SELECT DISTINCT ON (r.product_id)
    r.product_id,
    COALESCE(r.fob_usd_per_unit, r.fob_usd)                AS fob_unit,
    COALESCE(r.ex_factory_usd_per_unit, r.ex_factory_usd)  AS exw_unit
  FROM product_pricing_rules r
  WHERE r.is_active IS NOT FALSE
  ORDER BY r.product_id, r.effective_from DESC NULLS LAST
)
UPDATE products p
SET
  fob_price        = COALESCE(b.fob_unit, p.fob_price),
  exw_price        = COALESCE(b.exw_unit, p.exw_price),
  pricing_currency = COALESCE(p.pricing_currency, 'USD'),
  updated_at       = now()
FROM best b
WHERE p.id = b.product_id
  AND (b.fob_unit IS NOT NULL OR b.exw_unit IS NOT NULL);
