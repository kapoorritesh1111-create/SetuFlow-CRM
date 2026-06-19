# QA tester UX enhancements - deploy bundle

Three tester-facing improvements on the live QA flow. ALL DB CHANGES ARE ALREADY APPLIED LIVE.

## What changed
1. Per-case "where to test" link - qa_test_cases.target_path (added + seeded). Rendered as
   "Where to test: setuflowcrm.com/..." in the internal and external run boards. Refine any
   case's path in the DB and the UI picks it up automatically.
2. Share all suites - the SMC "Share Links" mint now has an "All suites" option. It creates a
   tester link with suite_key = NULL; /qa/run/[token] then loads every suite, grouped, and each
   result/finding carries its own suite. Single-suite links are unchanged.
3. Screenshot on Fail/Blocked - both now open a finding panel with "Attach screenshot". Uploads
   go to the existing public qa-evidence bucket through one route: POST /api/public/qa-evidence
   (external testers authorize with their tester token; internal users with their SETU session).
   The public URL is stored on qa_findings.evidence_url and shown in the Findings tab.
4. Share-link expiry standardised to preset 3 / 7 / 14 / 30 days (default 7) on QA tester links
   and Docs share links.

## Apply
- Code: overwrite the files in this bundle (paths preserved), run tsc --noEmit, deploy.
- DB: already applied live (the migration file is included only for repo history).
- No new buckets, no RLS changes, no anon policy added.

## Verify after deploy (most worth a look)
- SCREENSHOT UPLOAD is the part to smoke-test: on /qa/run/<token> mark a case Failed -> Attach
  screenshot -> expect "Screenshot attached", then Submit; confirm /smc/qa Findings shows the
  screenshot link. Repeat from the internal run board. Route enforces 10MB max, images only.
- ALL-SUITES link: mint with "All suites", open the token URL incognito -> every suite renders
  with headers; submit -> one run with suite_filter = all.
- PER-CASE link: each case shows the setuflowcrm.com/... link to the right area.

## Tracker
S33-QA-006 (in_review). Guest-session + guest Chat design locked as S33-GUEST-009 (open) - next PR.
