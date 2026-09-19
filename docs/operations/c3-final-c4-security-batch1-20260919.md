# C3 Final Non-Pricing + C4 Security Batch 1

Date: 2026-09-19

## C3
Final non-Pricing duplicate UNIQUE constraint removed:
- public.uq_lead_compliance

Retained:
- lead_compliance_items_lead_id_compliance_item_id_key

Remaining duplicate-index advisor findings: 6.
All 6 remaining groups are Pricing/Quote-related and intentionally held while Pricing v5 is active.

## C4 Batch 1
Anonymous execution removed from:
- app_advance_order_stage_tx
- app_convert_external_opportunity_to_lead
- app_create_lead_quote_draft_tx

Authenticated and service_role EXECUTE remain enabled.

Anonymous SECURITY DEFINER count:
- Before: 36
- After Batch 1: 33

Post-change runtime errors: 0.


## C4 Batch 2
Anonymous execution removed from:
- app_record_save_lead_non_stage_fanout_tx
- app_record_save_lead_stage_change_fanout_tx
- app_refresh_lead_relations_tx

Authenticated and service_role EXECUTE remain enabled.

Anonymous SECURITY DEFINER count:
- After Batch 1: 33
- After Batch 2: 30

Post-change runtime errors: 0.
