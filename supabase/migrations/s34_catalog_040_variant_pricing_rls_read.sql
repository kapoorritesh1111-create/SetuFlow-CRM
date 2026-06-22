-- S34-CATALOG-040/039 root fix: product_variants and product_pricing_rules had
-- RLS enabled but ZERO policies, so the org member (user-context) client read
-- nothing from them. Symptoms:
--   * Price List "Add Product" auto-filled the price (only because the flat
--     products.fob_price backfill existed) but MOQ / pack / lead time stayed
--     empty (those only live on product_variants).
--   * resolveProductPricing() silently fell back to flat columns because the
--     canonical product_pricing_rules read returned no rows.
--
-- products is already member-readable (products_select_member using
-- is_org_member). These two tables should be too — reads only; writes continue
-- to flow through admin/service paths. This makes MOQ auto-fill work and the
-- pricing resolver genuinely canonical across the app.

DROP POLICY IF EXISTS product_variants_select_member ON product_variants;
CREATE POLICY product_variants_select_member ON product_variants
  FOR SELECT USING (is_org_member(organization_id));

DROP POLICY IF EXISTS product_pricing_rules_select_member ON product_pricing_rules;
CREATE POLICY product_pricing_rules_select_member ON product_pricing_rules
  FOR SELECT USING (is_org_member(organization_id));
