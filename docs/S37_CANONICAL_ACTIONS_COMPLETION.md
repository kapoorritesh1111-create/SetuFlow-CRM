# Sprint 37 Canonical Workflow — Action Wiring Completion

This pass removes the caveat from the first canonical workflow implementation: the approved 10-screen UX is no longer a passive visual layer.

## Canonical action coverage

### Lead Detail

- Email, phone, and WhatsApp chips are real links.
- Pipeline stages submit through `moveCanonicalLeadStage`.
- Quick Edit saves lead/contact/deal/country/notes through `saveCanonicalLeadDetails`.
- Schedule Follow-up uses the canonical Lead Detail form.
- Mark Completed is wired through `completeCanonicalLeadFollowUp`.
- Qualification and product/market mapping save through `saveCanonicalQualificationMapping`.
- Quote CTAs route only to `/leads/[leadId]/quote`.

### Quote Builder

The canonical quote builder now owns the active quote workflow:

- Step 1 Products saves parent `quote_line_items` and current `quote_version_line_items`.
- Step 2 Pricing saves unit prices, basis, freight metadata, override state, and approval-required flag.
- Step 3 Terms saves quote/version terms, pricing basis, validity, currency, and customer/internal notes.
- Step 4 Review uses saved quote lines and totals instead of static-only placeholder totals.
- Step 5 Send Gate has wired submit-for-approval and send actions.
- Locked quotes stay read-only and only expose create-new-quote / history / order handoff.

## Old route cleanup

Old nested lead route links were replaced where found:

- contracts workspace now links to `/leads/[leadId]/quote`.
- order detail now links to `/leads/[leadId]`.
- RFQ workspace now links to `/leads/[leadId]/quote`.

The compatibility redirect in `/leads` remains intentionally, but only as a safety net for stale external links. It is not a visible UX surface.

## Parent quote status rule

The canonical actions do not write parent `quotes.status`, `current_version_id`, `sent_version_id`, or `accepted_version_id`. Parent status and pointers remain DB-derived from `quote_versions`.
