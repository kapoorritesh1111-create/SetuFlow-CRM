# S24-205 through S24-208 Quote Lifecycle Command Center Mitigation

## Current follow-up pass

This pass refines the first lifecycle implementation after live screenshot review.

### Key corrections

- Replaced the tall filter/dashboard block with a compact premium control strip closer to Orders.
- Added denser KPI tiles above filters so managers reach the work area faster.
- Added additional filters in one row: search, lifecycle, customer, from date, to date, and mode.
- Replaced the single endless grouped customer scroll with priority sections:
  - Needs Review
  - Revision Requested
  - Order Handoff
  - Follow-up Due
  - Archive / Closed
  - Draft / Other
- Added per-section limiting to reduce the side-scroll wall and keep priority groups readable.
- Corrected customer value logic so sent and accepted quotes are not double-counted as one active value.
- Added separate value buckets:
  - Proposed value
  - Accepted value
  - Order value
  - Cleanup value
  - Archive value
- Claude sample behavior corrected:
  - Q21 sent = proposed USD 35
  - Q22 accepted zero-line = cleanup / void candidate USD 0
  - Q23 accepted = accepted/order-ready USD 35
  - The customer panel must not display USD 70 as one active value.

## Database mitigation

Live Supabase already received additive lifecycle metadata:

- `quotes.archived_at`
- `quotes.archive_reason`
- `quotes.lifecycle_outcome`
- `quotes.follow_up_at`
- `quotes.last_customer_response_at`
- `quote_lifecycle_events`

No destructive data migration is required for this UI/value correction pass. The repo migration remains additive and idempotent.

## Regression checklist

1. Open `/quotes?quoteId=9ed66c7c-b44d-4496-9188-4835de55b44c&mode=buyers`.
2. Confirm the top filter/KPI area is compact and no longer consumes excessive vertical space.
3. Confirm the customer worklist is sectioned by priority instead of one undifferentiated scroll wall.
4. Confirm Claude shows separated values: proposed, accepted, order, cleanup, and exposure.
5. Confirm Claude does not show USD 70 as a single active value.
6. Confirm Q21 is sent/proposed, Q22 is cleanup/void candidate, and Q23 is accepted/order-ready.
7. Confirm archive mode still exposes expired/rejected records.
8. Confirm mobile layout still stacks cards and keeps actions usable.
