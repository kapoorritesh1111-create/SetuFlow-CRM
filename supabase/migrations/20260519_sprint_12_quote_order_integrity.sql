-- Sprint 12: Quote-to-order integrity
-- Applied via MCP 2026-05-19
-- Adds: CHECK constraint on orders(source_quote_version_id),
--       audit trigger trg_audit_order_quote_lineage,
--       lead_quote_gate_log table,
--       versioning columns on organization_document_terms_profiles.
SELECT 'sprint_12_quote_order_integrity_marker' as migration;
