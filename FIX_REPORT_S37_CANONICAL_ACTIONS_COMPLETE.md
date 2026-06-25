# FIX REPORT — Sprint 37 Canonical Actions Complete

## Goal
Remove the remaining caveat from the approved 10-screen canonical workflow so users do not land in old/passive quote or lead UX surfaces.

## Implemented

### Lead Detail
- Follow-up completion is wired through `completeCanonicalLeadFollowUp`.
- Qualification saves through `saveCanonicalQualificationMapping` without clearing existing mappings.
- Product/market mapping saves through `saveCanonicalQualificationMapping`.
- Quick Edit remains wired through `saveCanonicalLeadDetails`.
- Pipeline movement remains wired through `moveCanonicalLeadStage`.
- Quote buttons route only to the canonical quote builder.

### Quote Builder
- Added `src/features/quotes/canonical/actions.ts`.
- Step 1 Products now posts to `saveCanonicalQuoteProducts`.
- Step 2 Pricing now posts to `saveCanonicalQuotePricing`.
- Step 3 Terms now posts to `saveCanonicalQuoteTerms`.
- Step 5 Send Gate now posts to:
  - `submitCanonicalQuoteApproval`
  - `sendCanonicalQuote`
- Parent quote status and version pointers remain DB-derived. The canonical action layer does not write `quotes.status`, `current_version_id`, `sent_version_id`, or `accepted_version_id`.

### Old route cleanup
- Updated contracts, orders, and RFQ links away from nested `/leads?leadId=&view=*` routes.
- The old `/leads?leadId=&view=*` handler remains only as a silent compatibility redirect for stale links.
- No primary visible route sends users back to the old nested quote workspace.

## Validation
- `npm install --no-audit --no-fund` was run locally only to restore missing dependencies from the uploaded zip. `npm ci` was not run.
- `npm run typecheck -- --pretty false` passed.
- `npm run build` was attempted but blocked by sandbox DNS access to Google Fonts (`fonts.googleapis.com`, `EAI_AGAIN`). This is the same sandbox network limitation as the previous pass, not a TypeScript failure.
