# C3 Duplicate Index Cleanup — Batches 2 and 3

Date: 2026-09-19

## Batch 2
Removed:
- public.idx_documents_org_entity
- public.idx_freight_profile_items_profile_line
- public.pipeline_stages_pipeline_sort_idx

## Batch 3
Removed:
- public.idx_lead_scores_lead
- public.document_requirement_rules_unique_active_idx
- public.org_module_grants_organization_module_key_idx

All removed indexes were advisor-confirmed duplicates and not constraint-owned. Retained equivalents remain present.

For org_module_grants, the retained equivalent is the constraint-owned unique index:
- public.org_module_grants_unique

Advisor duplicate-index findings:
- Start: 22
- After Batch 1: 19
- After Batch 2: 16
- After Batch 3: 13

Production runtime errors remained at zero during post-change checks.

Pricing v5 code and Pricing-specific duplicate-index groups were intentionally not touched.
