# Orders approved PDF fallback and quote-version reconciliation

Route: `/orders`
Owner: Setu Guru knowledge base
Last updated: 2026-05-11

## Sprint 8T decision

Some historical quotes have a correct buyer-facing approved PDF in Lead Command Center, but the stored `quote_versions`, `quote_version_line_items`, or contract line snapshots may not match the sent PDF.

Orders must not silently treat those historical quote-version rows as clean commercial truth.

## Source-of-truth rule

For clean future quotes:

```text
Approved quote version
→ actual order lines
→ internal approval
→ Order Confirmation / Proforma
→ packing / logistics / final invoice
```

For historical quote-version issues:

```text
Approved PDF available in Lead Command Center
→ quote-version data incomplete or mismatched
→ reconcile approved PDF/commercial snapshot first
→ then seed/confirm actual order lines
```

## Operator-facing policy

When historical data does not match the buyer-approved PDF, Orders should show a reconciliation state instead of pretending the order is clean.

Examples:

- Approved PDF present, quote-version rows incomplete.
- Approved PDF present, stored quote/contract/order total differs from PDF total.
- Accepted quote has no linked PDF/commercial snapshot in `documents` or contract snapshot fields.
- Actual order rows are only quote-preview rows and not persisted `order_lines` yet.

## Button policy

Remove only applies to real persisted `order_lines`.

- Real actual order line: Remove sets actual quantity to `0`, marks the line removed, saves a human reason, and audits the change.
- Quote-preview line: Remove must not pretend to work. The operator must prepare actual lines first.

## Setu Guru policy

Guru should explain historical-data reconciliation clearly:

- The buyer-approved PDF may be correct even when the quote-version row is wrong.
- Orders should reconcile from the approved PDF/source before creating buyer-facing execution documents.
- Quote history must not be mutated to hide the mismatch.
- Actual order lines are additive execution records, not edits to the original quote.

Guru must not:

- approve actual order lines when the approved commercial snapshot is missing or mismatched;
- generate Order Confirmation / Proforma / Invoice from unreconciled historical quote data;
- delete or mutate quote history;
- claim a quote is commercially locked unless the approved PDF/snapshot is present or reconciled.

## Smoke-check checklist

- Remove works only for real `order_lines`.
- Remove on quote-preview rows redirects to prepare actual lines first.
- Historical quote-version mismatch is explained as reconciliation, not silent failure.
- Approved PDF/source from Lead Command Center remains the trusted buyer-facing reference.
- Quote history remains untouched.
- Orders workflow remains queue-left/open-order-right.
