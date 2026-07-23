# FIX REPORT — S37-ENH-008

**Title:** First-class approval flow (submit → `approval_requests` → send guard)
**Status:** In Review
**DB migrations:** `supabase/migrations/20260625150000_s37_enh_008_quote_approval_flow.sql` (applied live to `sjzfzloggabsmcuxktnl`)

## Problem
Quote approval state lived only in timeline notes / denormalized `quotes` columns. The `approval_requests`
table (created in TASK-001) was unused, the legacy "request approval" action even tagged its note
`test_mode: true`, and the send guard had no first-class approval signal to consult.

## Critical DB constraint that shaped the design
`app_quote_version_is_immutable()` marks `approved` (and `sent`/`accepted`/`rejected`/`expired`) as
**immutable**, and `app_prevent_locked_quote_version_mutation` only allows `approved → superseded`
— so **`approved → sent` is blocked**. Therefore the approval flow must **never** promote a quote
version to the `approved` status. The decision is recorded in `approval_requests` (source of truth);
the working version stays mutable.

## What changed

### Migration `20260625150000_s37_enh_008_quote_approval_flow.sql` (3 SECURITY DEFINER routines)
- **`app_submit_quote_approval_tx(org, quote, version, actor, rule, reason)`** → `(approval_request_id, status, created)`.
  Membership-gated (`is_org_member`). Idempotent: reuses an open pending request for the version
  (`created=false`) via the `approval_requests_one_pending_per_version` partial unique index. Moves a
  mutable version `draft → approval_pending` (parent quote derives to `in_review` via the existing
  sync trigger). Writes an `audit_logs` row. Refuses to submit a locked/immutable version.
- **`app_decide_quote_approval_tx(org, quote, version, actor, decision, reason)`** → `(approval_request_id, status)`.
  Decides the pending request (`decided_by` / `decided_at`), or records a decided "self_*" request when
  no pending one exists (authorized self-approval audit trail). On **reject**, returns the working
  version to `draft` for revision. **Never** sets the version to the immutable `approved` status.
- **`app_quote_version_approval_state(version)`** → `text` read-model: `pending` (priority) → most
  recent `approved`/`rejected` by `decided_at` → else `none`. Used by the send guard.

### `src/lib/quote-gate.ts`
- `QuoteApprovalState` type + `quoteApprovalBlocker(state)` → typed `{ code, detail }` blocker for
  `pending` / `rejected`, `null` otherwise.

### `src/features/leads/server/actions/legacy-actions.ts`
- Added `resolveLeadQuoteForApproval(db, org, lead, quoteId)` — resolves the quote + its
  `current_version_id` (explicit id, else lead's most recent quote).
- `recordLeadQuoteApprovalRequest` → calls `app_submit_quote_approval_tx` (removed the `test_mode`
  note; timeline note now references the real `approval_request_id`).
- `approveLeadQuoteAdjustment` / `rejectLeadQuoteAdjustment` → call `app_decide_quote_approval_tx`
  (`approved` / `rejected`). The denormalized `quotes.approved_at` / `approved_by` /
  `approval_required` / `notes_internal` writes are **retained as display-only** (status authority
  stays DB-derived).

### `src/features/quotes/server/actions.ts`
- `buildQuoteSendDecisionSnapshot` gained an optional `approvalRequestState?: QuoteApprovalState`
  and adds a **deduped** `APPROVAL_PENDING` / `APPROVAL_REJECTED` blocker.
- The send path (`updateQuoteWorkflow`, `status === 'sent'`) now calls
  `app_quote_version_approval_state` for the current version and feeds it into the snapshot. The
  guard is **additive** — it can only add blockers, never loosen — so it is safe.

## Authority preserved
- No version is promoted to the immutable `approved` status, so `approved → sent` is never blocked.
- No new app-side `quotes.status` writes; parent status / pointers stay DB-derived by the
  `quote_versions` sync trigger.

## Validation (live, rollback-safe; impersonating an org member via `request.jwt.claims`)
1. **Happy path** (draft `8aca6a20…`): submit → `pending` / `created=true`; re-submit → `created=false`
   same id (idempotent); state `pending`; version `approval_pending`; parent quote `in_review`;
   approve → `approved`; **version stays `approval_pending` (not locked)**.
2. **Reject path** (draft `04c13a39…`): submit → `approval_pending`; reject → `rejected`; version
   returns to `draft`; state `rejected`; resubmit → new `pending` request created.
   All transactions **rolled back** — live data untouched.
- `npx tsc --noEmit` → **0 errors**.
