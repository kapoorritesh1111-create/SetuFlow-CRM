# S37 Canonical Hardfix Action Audit

This pass removes the remaining visible old-route leaks and makes canonical actions visibly complete enough for production review.

## Canonical visible routes

- `/leads`
- `/leads/[leadId]`
- `/leads/[leadId]/quote?quoteId=[quoteId]&step=1..5`
- `/orders?quoteId=[quoteId]`

## Removed visible old-route leaks

The following old route patterns are no longer emitted by source links in `src/components`, `src/lib`, or canonical workspace navigation:

- `/leads?leadId=[id]&view=quote`
- `/leads?leadId=[id]&view=cc`
- `/leads?leadId=[id]&view=workflow`

The `/leads?leadId=&view=*` handler remains only as a defensive redirect for stale external links.

## Lead Detail visible action wiring

- Email chip: `mailto:`
- Phone chip: `tel:`
- WhatsApp chip: `wa.me`
- Edit Lead: anchors to Quick Edit and saves via `saveCanonicalLeadDetails`
- Schedule Follow-up: saves via `scheduleCanonicalLeadFollowUp`
- Mark Completed: saves via `completeCanonicalLeadFollowUp`
- Qualify Lead: anchors to qualification and saves via `saveCanonicalQualificationMapping`
- Map Products: anchors to mapping and saves via `saveCanonicalQualificationMapping`
- Share Price List: canonical `/leads/[leadId]/share-price-list`
- Open Current Quote: canonical `/leads/[leadId]/quote?quoteId=[quoteId]&step=1`
- View Locked Quote: canonical locked quote builder view
- Create New Quote: canonical fresh quote draft RPC path

## Quote Builder visible action wiring

- Stepper links route within `/leads/[leadId]/quote?quoteId=&step=1..5`
- View as Customer routes to quote PDF endpoint
- Step 1 Products saves via `saveCanonicalQuoteProducts`
- Step 2 Pricing saves via `saveCanonicalQuotePricing`
- Step 3 Terms saves via `saveCanonicalQuoteTerms`
- Step 4 Review routes to Step 5
- Step 5 Send Gate supports `Preview Quote PDF`, `Submit for Approval`, and `Send Quote`
- Locked quote creates a new quote without mutating the accepted quote

## Validation

- `npm install --no-audit --no-fund` completed locally.
- `npm run typecheck -- --pretty false` passed.
- `npm run build` was attempted but sandbox DNS could not fetch Google Fonts (`fonts.googleapis.com`, `EAI_AGAIN`). This is an environment/network blocker, not a TypeScript failure.
