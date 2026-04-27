You are working on the SETU Flow CRM production repository.

Use the current repo as the single source of truth.

Objective: Complete PR-NS-09 - Live Validation and Execution UX Closure.

Starting point:
- PR-NS-08 hardened quote version snapshots, pipeline drag/drop persistence safety, and order document upload persistence.
- Continue from the updated repository returned with PR-NS-08.

Scope:
1. Run full validation on a live Supabase-backed environment.
2. Confirm the order-documents storage bucket exists with correct policies.
3. Wire the order document upload action into Orders/Documents UX if it is not already exposed.
4. Validate quote version history from v1 to v2 to v3 across edit, approve, send, reject, and expire actions.
5. Validate Catalog to Quote line persistence including quantity, unit price, override reason, margin or override display, and drawer reopen state.
6. Validate Quote to Order contract handoff copies accepted quote line items correctly.
7. Validate Pipeline drag/drop persistence after refresh, including rollback behavior on simulated failure.
8. Run npm ci, npm run typecheck, npm run test, and npm run build.

Output required:
- Full updated repo zip.
- Internal DCC update.
- Readiness status with percentages.
- Evidence of build, typecheck, and test results.
- Remaining blockers, if any.
