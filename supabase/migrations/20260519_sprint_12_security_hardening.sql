-- Sprint 12: Security hardening
-- Applied via MCP 2026-05-19
-- REVOKE EXECUTE FROM anon on 32 non-trigger SECURITY DEFINER RPCs.
-- SET search_path = '' on 12 plpgsql functions.
-- Recreated active_product_pricing_rules_v and v_quote_eligible_products as SECURITY INVOKER.
SELECT 'sprint_12_security_hardening_marker' as migration;
