# Mitigation SQL execution order

Run these in filename order.

1. `001_env_and_secrets_checklist.sql`
2. `010_audit_log_table.sql`
3. `015_auth_profile_link_check.sql`
4. `020_app_upsert_lead_rpc.sql`
5. `030_rls_hardening_notes.sql`
6. `040_add_parent_id_to_product_categories.sql`
7. `041_foundation_indexes_and_uniques.sql`
8. `042_search_aliases_and_reference_data.sql`
9. `043_role_and_audit_hardening.sql`
10. `044_refresh_app_upsert_lead_rpc.sql`
11. `045_enable_rls_core_tables.sql`
12. `046_saved_views.sql`
13. `047_view_preferences.sql`
14. `048_organization_invitations.sql`
15. `049_pricing_provenance_line_items.sql`
16. `050_documents_and_compliance_workflow.sql`
17. `051_catalog_price_integrity.sql`
18. `052_structured_audit_events.sql`
19. `053_document_requirement_rules_and_progression_guards.sql`
20. `054_phase8_schema_reconciliation.sql`
21. `056_phase9_permissions_and_release_hardening.sql`
22. `060_pricing_quote_engine_quotes_reconciliation.sql`
23. `061_pricing_quote_engine_indexes.sql`
24. `062_pricing_quote_engine_functions_and_triggers.sql`
25. `063_pricing_quote_engine_backfill.sql`
26. `064_pricing_quote_engine_transactional_rpcs.sql`
27. `065_pricing_quote_engine_rls_hardening.sql`
28. `066_pricing_quote_engine_backfill_safety.sql`
29. `067_phase0_cif_cleanup.sql`
30. `068_phase1_communications.sql`
31. `069_phase1_trade_event_entries.sql`
32. `070_phase1_pricing_ssot_and_lead_field_deprecation.sql`
33. `071_phase4_ai_suggestions_review_console.sql`
34. `072_phase4_ai_suggestions_default_and_quote_indexes.sql`
35. `073_pipeline_stage_move_transaction_rpc.sql`
36. `074_batch_pipeline_stage_move_transaction_rpc.sql`
37. `075_lead_relation_refresh_transaction_rpc.sql`
38. `076_lead_follow_up_replace_transaction_rpc.sql`
39. `077_save_lead_stage_history_transaction_rpc.sql`
40. `078_save_lead_stage_change_fanout_rpc.sql`
41. `079_save_lead_non_stage_fanout_rpc.sql`
42. `080_create_quote_with_line_items_tx.sql`
43. `081_accepted_quote_contract_creation_tx.sql`
44. `082_product_catalog_transaction_rpc.sql`
45. `083_catalog_price_transaction_rpc.sql`
46. `084_catalog_price_delete_transaction_rpc.sql`
47. `085_product_deactivate_transaction_rpc.sql`
48. `086_create_rfq_with_line_items_tx.sql`
49. `087_update_rfq_with_line_items_tx.sql`
50. `088_update_quote_with_line_items_tx.sql`
51. `089_create_quote_with_line_items_and_fanout_tx.sql`
52. `090_seed_rfq_quote_compliance_testing.sql` (optional test data)
53. `091_update_quote_with_line_items_and_fanout_tx.sql`
54. `092_send_quote_version_with_fanout_tx.sql`
55. `093_create_rfq_with_line_items_and_fanout_tx.sql`
56. `094_update_rfq_with_line_items_and_fanout_tx.sql`

57. `095_document_workflow_transaction_rpc.sql`
58. `096_compliance_workflow_transaction_rpc.sql`
59. `097_contract_progression_transaction_rpc.sql`

60. `098_settings_admin_transaction_rpcs.sql`
61. `099_admin_membership_invitation_transaction_rpcs.sql`
62. `100_invitation_acceptance_bootstrap_transaction_rpc.sql`
63. `101_contract_workspace_details_transaction_rpc.sql`
