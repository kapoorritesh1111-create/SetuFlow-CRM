# Pass 22 Coverage-First Workflow Hotfix

## Goal

Buyer workflow should not force manual qualification before product coverage. Operators should map products first, then buyer qualification should complete automatically when confirmed product coverage is saved.

## Changes

- Changed command-center next-action priority to surface Coverage before Qualification and Follow-up when coverage is missing.
- Changed support-card fallback order to Coverage -> Qualification -> Follow-up.
- Updated Qualification helper language to explain that coverage comes first.
- Updated Coverage helper language to explain that product mapping drives auto-qualification.
- Updated `saveLeadCoverage` so buyer leads auto-qualify when at least one confirmed product is saved.
- Preserved manual disqualification: disqualified leads are not auto-qualified.
- Added activity and communication entries when auto-qualification happens.
- Added `organization_id` to direct `lead_product_interests` inserts in coverage save.
- Added safe SQL to delete accidental `TestStage` after moving any leads and stage history references back to the pipeline's `New Lead` stage.

## Supabase mitigation

Run:

```sql
mitigation/supabase/sql/124_pass22_delete_teststage_and_workflow.sql
```

This only cleans up the accidental stage. The coverage-first behavior is app code.

## Retest

1. Open a buyer lead with missing coverage.
2. Confirm Coverage is the recommended blocker before Qualification.
3. Open Coverage Manager.
4. Map one product.
5. Save coverage.
6. Confirm the buyer is automatically marked Qualified.
7. Confirm quote prep no longer shows buyer qualification as pending.
8. Confirm TestStage is gone after applying the SQL.
