# FIX REPORT — S37-BUG-007

**Title:** Enforce quote gate server-side (disqualified / no coverage / required) with typed, buyer-safe messaging
**Status:** In Review
**DB migrations:** none (pure app-layer consolidation)

## Problem

The quote gate (disqualified lead / no product coverage / lead-not-found) was enforced in three
different places with three slightly different wordings, and several paths leaked raw Postgres
`.message` strings straight to the UI:

- `getLeadQuoteGate()` returned `leadError.message` / `productsError.message` verbatim.
- `ensureLeadCommercialReadiness()` (the wizard `createQuote` path) returned raw `.message` and its
  own ad-hoc copy.
- The canonical RPC path (BUG-006) had a *local* `mapLeadQuoteDraftRpcError()` not shared with the
  other entry points.

## What changed

### New: `src/lib/quote-gate.ts` (single source of truth)
- `LeadQuoteGateCode` union + `LEAD_QUOTE_GATE_MESSAGES` map + `leadQuoteGateMessage(code)`.
- `mapLeadQuoteRpcErrorToCode(error)` — classifies canonical RPC SQLSTATE (`42501`, `P0002`,
  `22023`, `P0001` disqualified / company-name / coverage) into a typed code.
- `mapLeadQuoteDraftRpcError(error)` — buyer-safe string for the lead-draft RPC (moved here from
  `legacy-actions.ts`; P0001 business-rule messages are already buyer-safe and surfaced verbatim).
- (ENH-008 also lives here: `QuoteApprovalState` + `quoteApprovalBlocker`.)

### `src/features/leads/server/actions/legacy-actions.ts`
- Removed the local `mapLeadQuoteDraftRpcError` duplicate; imports it from `@/lib/quote-gate`.
- `getLeadQuoteGate()` now returns a typed `{ ok:false, code, error }` and **sanitizes** raw DB
  errors to `LOAD_FAILED` (logged via `logServerError`).
- Lead-load failures in `openOrCreateLeadQuoteDraft` and `createLeadQuoteDraftFromSource` no longer
  leak raw `.message` — they return `leadQuoteGateMessage('LOAD_FAILED' | 'LEAD_NOT_FOUND')`.

### `src/features/quotes/server/actions.ts`
- `ensureLeadCommercialReadiness()` now uses the same typed copy (`LEAD_DISQUALIFIED`,
  `NO_PRODUCT_COVERAGE`, `LEAD_NOT_FOUND`, `LOAD_FAILED`) and logs raw DB errors instead of
  returning them.

## Result
Every quote-creation / quote-open entry point (lead-draft RPC, wizard `createQuote`, launcher
clone/new, command-center) resolves the same buyer-safe wording for the same gate condition, and no
raw SQL error reaches the UI.

## Validation
- `npx tsc --noEmit` → **0 errors**.
- `node scripts/check-contract-boundaries.mjs` → no new advisories (3 pre-existing pricingBasis
  advisories remain in untouched files: `leads-workspace-implementation.tsx`,
  `OrdersProductionWorkspace81DRepair3.tsx`, `order-document-pdf.ts`).
- Grep confirms no raw `.message` returns remain in the gate/approval functions.
