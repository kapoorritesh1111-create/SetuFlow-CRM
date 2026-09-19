# C3 Duplicate Index Cleanup — Batch 5

Date: 2026-09-19

Removed:
- public.idx_lead_compliance
- public.idx_lead_compliance_lead_item
- public.idx_lead_compliance_unique
- duplicate UNIQUE constraint pipelines_organization_id_name_key
- duplicate UNIQUE constraint product_categories_organization_id_name_key

Retained:
- lead_compliance unique enforcement remains in place
- pipelines_org_name_key remains the canonical UNIQUE constraint
- product_categories_org_name_key remains the canonical UNIQUE constraint

Advisor duplicate-index findings:
- Start: 22
- After Batch 4: 10
- After Batch 5: 7

Remaining groups are primarily Pricing/Quote-sensitive, plus the duplicated UNIQUE constraint pair on lead_compliance_items.

Runtime errors remained at zero after verification.
