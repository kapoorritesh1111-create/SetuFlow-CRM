-- S24-205 through S24-208 follow-up refinement
-- No destructive DB changes required.
-- Value buckets are computed in the app from quote lifecycle state:
-- proposed_value: draft/internal/sent/revision/pending quote work
-- accepted_value: accepted quotes not yet represented by order/contract handoff
-- order_value: accepted quotes with order/contract handoff
-- risk_value: invalid/zero-line accepted quote records
-- archive_value: rejected/expired/archived records
-- This file documents the live mitigation rule in the repo for deployment traceability.
select 's24_quote_value_bucket_refinement_noop' as migration_note;
