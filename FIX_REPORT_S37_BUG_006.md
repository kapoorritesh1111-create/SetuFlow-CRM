# FIX REPORT — S37-BUG-006

**Title:** Unify Drawer + Wizard onto canonical RPC; retire `createQuoteDirect`
**Status:** In Review
**DB migrations:** none (pure app wiring onto the already-live `app_create_lead_quote_draft_tx` RPC)

## What changed

### `src/features/leads/server/actions/legacy-actions.ts`
- `openOrCreateLeadQuoteDraft(leadId)` — the Drawer/Wizard "Create Quote / Open Quote" entry point —
  now routes **brand-new draft creation** through the canonical transactional RPC
  `app_create_lead_quote_draft_tx(p_organization_id, p_lead_id, p_actor_user_id, p_idempotency_key)`.
  - The RPC gates (org membership, lead existence, disqualified, company name, ≥1 active product
    interest), creates `quotes` + v1 `quote_versions` + `quote_line_items` + `quote_version_line_items`,
    and seeds `lead_activities` / `communications` / `audit_logs` in one transaction. It is idempotent
    per `(organization_id, lead_id)`.
  - The existing-quote lookup branch is **retained** so that leads that already have a draft (including
    legacy quotes created before the idempotency key existed) keep opening their current draft instead of
    spawning a duplicate quote.
  - Removed the app-side direct `quotes`/`quote_versions` inserts, `ensureDraftQuoteVersion`,
    `ensureQuoteLineItemsFromLeadCoverage`, and manual activity/communication/audit on the create path
    (all now handled inside the RPC).
- Added `mapLeadQuoteDraftRpcError()` — converts RPC SQLSTATE failures into typed, buyer-safe UI copy:
  `42501` → access denied, `P0002` → lead not found, `22023` → missing info, `P0001` → business-rule
  blocker surfaced verbatim (disqualified / no company name / no active product interest).
- Return shape (`{ error | success, quoteId, quote: { …, current_version_id, lineItems }, version }`) is
  preserved, so the drawer `onOpenInlineQuote(...)` callback and the command-center
  `?view=quote&quoteId=` redirect continue to open the builder.

### `src/features/quotes/server/actions.ts`
- Deleted `createQuoteDirect` (the legacy app-side direct-insert fallback) and its call inside `createQuote`.
- `createQuote` now relies solely on `app_create_quote_with_line_items_and_fanout_tx`; if that RPC is
  missing it returns a typed, user-safe error instead of silently falling back to app-side inserts.

## Authority preserved
- No new app-side `quotes.status` writes and no app-side version-pointer writes were introduced.
  Parent `quotes.status`, `current_version_id`, `sent_version_id`, `accepted_version_id`, and `version_no`
  remain DB-derived by the `quote_versions` sync trigger.

## Validation
- `npx tsc --noEmit` → **0 errors** across the project.
- `node scripts/check-contract-boundaries.mjs` → exit 0 (only pre-existing `pricingBasis` advisories in
  unrelated files).
- Grep: no live `createQuoteDirect` references; RPC wired into `legacy-actions.ts`; no new
  `quotes.update({ status })` writes.
- Live DB: confirmed `app_create_lead_quote_draft_tx` exists with the matching signature and is
  idempotent per `(org, lead)`.

## Out-of-scope items flagged for follow-up
- Three pre-existing app-side `quotes.update({ status })` writes remain in
  `src/app/(app)/approval-send/page.tsx` (~L91), `src/features/quotes/server/actions.ts` (~L1010), and
  `src/features/quotes/pricing/repositories/quote-pricing.repository.ts` (~L901). These are **harmless
  no-ops** under the live `app_guard_quote_parent_status_write` guard (it reverts `new.status := old.status`
  unless the version-sync session flag is set), so nothing is broken in production. They should be cleaned
  up as part of the send/negotiation rework in **S37-ENH-008 / S37-UX-010**.
- The advanced launcher actions (`createNewLeadQuoteDraft` / `createQuoteRevisionFromQuote` /
  `cloneQuoteForRepeatBusiness`) and `saveLeadQuoteDraftPreview` edit-path were intentionally left
  unchanged. The lead-draft RPC is idempotent-per-lead and seeds from lead interests, so it does not fit
  "separate new draft" or "clone from a source quote" semantics; those belong with the version-lifecycle
  work in **S37-UX-010**.
