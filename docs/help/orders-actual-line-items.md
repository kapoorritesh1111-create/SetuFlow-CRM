# Orders actual line-item workspace help

Route: `/orders`
Owner: Setu Guru knowledge base
Last updated: 2026-05-11

## Sprint 8R purpose

Sprint 8R adds the missing actual line-item workspace to the approved Orders redesign.

The Orders workspace must show the buyer commitment before internal approval:

```text
Open Order Header
→ Quote-to-Order Line Items
→ Workflow Stage Strip
→ Current Stage Action Panel
```

## What operators should see

The selected order workspace must show:

1. Approved quote lines.
2. Actual order quantities.
3. Added, removed, changed, unchanged, and needs-actual-lines statuses.
4. Line total and actual total.
5. Reason capture for quantity/price changes.
6. Add actual line for buyer items that were not on the quote.
7. Remove line when the buyer does not include a quoted line in the actual order.
8. Save action for ordered quantity, unit price, and change reason.

## Source of truth

Quote history is protected. Actual order editing uses the additive execution tables:

- `orders`
- `order_lines`

The approved quote is the commercial source. Actual order lines are the buyer commitment for execution.

## Setu Guru policy

Guru should explain that not every quoted item becomes the order. Buyer quantity may be more, less, or different from the quote.

Guru must not:

- mutate quote history;
- approve actual lines without explicit action;
- add/remove/change lines without explicit user action;
- skip internal approval;
- send Order Confirmation or Proforma before actual lines are confirmed.

## Internal approval rule

Before internal approval, each line should be one of:

- unchanged;
- changed with reason;
- removed with reason;
- added with reason.

If lines are still `needs actual lines`, the operator should prepare actual lines first.

## Smoke-check checklist

- Does `/orders` show Quote → Actual order lines before the stage strip?
- Do approved quote lines appear even before actual lines are prepared?
- Does Prepare actual lines create editable execution lines?
- Can actual quantity and price be saved?
- Can a quoted line be marked removed?
- Can a manual actual order line be added?
- Does quote history remain untouched?
- Are quote/compliance/catalog/lead/dashboard protected flows untouched?
