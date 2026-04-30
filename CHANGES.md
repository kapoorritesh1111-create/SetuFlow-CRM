# PR-NS-16B — Live Connector DCC Baseline

Date: 2026-04-30

Changed:
- Updated the DCC operating model now that Supabase and Vercel are connected to GPT.
- Tested Supabase access and confirmed SETU Flow CRM project `sjzfzloggabsmcuxktnl` is ACTIVE_HEALTHY.
- Tested Vercel access and confirmed team `team_FUuclvXHj0efPiI9SQJvY1nK` and project `prj_j3kkTnBcjXKyLLEw9IEMXBfVzfFG` are accessible.
- Recorded latest observed Vercel production deployment `dpl_AbF8tddXDqGQKpKxiNMjLvpCx8rr` as READY.
- Added `docs/LIVE_CONNECTOR_DEVELOPMENT_BASELINE.md`.
- Updated PR tracker, release readiness, investor readiness, and PR-NS-17+ gap closure plan to require live Supabase/Vercel verification when relevant.
- Updated internal DCC prompt requirements so future builds record live verification results.

No application runtime code was changed in this pass.

No `npm ci` was run.

# PR-NS-16A — Investor-Grade Gap Closure DCC Refresh

Date: 2026-04-30

Changed:
- Replaced optimistic DCC readiness posture with investor-grade truth reset.
- Added critical/high/medium/low/nice-to-have PR ladder from PR-NS-17 through PR-NS-25.
- Added mandatory future-build rules: update DCC in all affected tabs, list changed files, return full repo zip, include next prompt, and do not run `npm ci`.
- Updated PR tracker, release readiness, investor readiness, and added the dedicated gap closure plan doc.

No application runtime code was changed in this pass.
