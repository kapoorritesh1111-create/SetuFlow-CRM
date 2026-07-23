# Sprint 33 — QA-003 / QA-004 / QA-005 / DOC-008 — Deploy Notes

## Order of operations (important)
1. Deploy this code bundle.
2. **At the same deploy**, apply the destructive migration
   `supabase/migrations/20260619160000_close_anon_writes_DEPLOY_WITH_S33_QA_005.sql`.

Do **not** apply that migration before the code is live. The current production still
serves the static issue-tracker / e2e / demo-checklist apps, which anon-write to
`sprint_issues`. Dropping the anon policies first would break live production in the gap.

The additive, safe DB changes (scoped anon-INSERT on `qa_findings`; the `docs_share_*`
tables) are already applied live and are harmless until this code ships.

## Deletions (already removed from this bundle's tree)
- `public/internal/setuflow-issue-tracker.html`
- `public/internal/setuflow-e2e-testing.html`
Make sure these are deleted in the repo (not just absent from the zip).

## After deploy
- Verify the Docs Hub "Share Doc" flow still works (anon SELECT on `sprint_issues` is retained).
- Smoke-test: mint a tester link in /smc/qa → open /qa/run/<token> in a private window →
  submit → confirm a finding appears (external) and Promote creates a tracker issue.
- Publish a snapshot → open /qa/report/<token> read-only.
- Mint a docs link in /smc/wiki → open /docs/<token> → confirm the view count increments.
- Run `tsc --noEmit` before merge (sandbox can't build).

## RLS posture after the migration
- `sprint_issues`: anon SELECT kept; anon INSERT/UPDATE removed.
- `qa_test_runs` / `qa_step_results` / `qa_evidence`: anon SELECT kept; anon INSERT/UPDATE removed.
- `qa_findings`: scoped anon INSERT (external buffer only) + member SELECT.
- `docs_share_links` / `docs_share_views`: member SELECT; writes via service role only.
