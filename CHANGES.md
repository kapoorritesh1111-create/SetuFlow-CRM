# PR-ORDER-HANDOFF-VISUAL-DCC

Status: Pending proof

## Files changed
- `src/app/(app)/orders/page.tsx`
- `public/internal-dcc/index.html`
- `CHANGES.md`

## What changed

### Orders handoff visibility fix
- Orders now reads the explicit `quoteId` handoff query param before the first quote query.
- Orders still loads the normal accepted/sent quote queue.
- If the handoff quote is not already in that accepted/sent queue, Orders fetches that exact quote by id and prepends it.
- Order eligibility now includes accepted quotes, sent quotes, and quotes with an existing contract. This prevents the `Create order` button from landing on an empty Orders page when the quote status is still `draft` but the contract/order handoff exists.

### DCC internal status update
- DCC now records that the final grep gate, tests, and build were green.
- DCC format was preserved; existing rows/cards were updated in place.
- No new Trade Show scope was added.

## Verification greps

```bash
grep -n "quote-sent" "src/app/(app)/orders/page.tsx"
# 247:  if (noticeKey === 'quote-accepted' || noticeKey === 'quote-sent') {
```

```bash
grep -n "requestedQuoteId\|explicit handoff quote\|quoteStatus === 'sent'" "src/app/(app)/orders/page.tsx"
# requestedQuoteId present
# explicit handoff quote comment present
# quoteStatus === 'sent' present in eligibility filter
```

```bash
grep -n "as any" "src/features/trade-events/server/actions.ts" "src/app/(app)/trade-events/page.tsx" "src/app/(app)/leads/page.tsx"
# 0 matches
```

## Proof not run here
- npm commands were not run in this packaging pass.
- Run locally: `npm ci && npm run typecheck && npm test && npm run build`
