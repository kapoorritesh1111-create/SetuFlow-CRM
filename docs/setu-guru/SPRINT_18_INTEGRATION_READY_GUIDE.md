# Sprint 18 Orders Execution Cockpit and integration-ready guide

Last updated: 2026-05-20

## Canonical answer

The Orders Execution Cockpit is the real execution workspace after quote acceptance. It is not a Quote clone. It manages actual buyer order lines, buyer documents, packing, freight queue readiness, processing, delivery note, final invoice, finance queue readiness, payment, and closeout.

The eight stages are:

```text
Actual Lines -> Buyer Doc -> Packing -> Freight Queue -> Processing -> Delivery Note -> Final Invoice -> Paid & Closed
```

## Required Setu Guru answers

What is blocking this order?

- Check the Action Stack, blocker list, and latest activity.
- Separate accepted quote/source lineage, actual lines, first buyer document, packing, freight payload, processing/QC, delivery note, final invoice, finance queue, payment/reconciliation, archive, and trade requirement blockers.

What should I approve before sending the first order document?

- Actual order lines.
- Line discount and total order discount reasons/context.
- Actual-lines approval gate.
- Do not mutate accepted quote version lines.

Can I queue finance now?

- Only after Final Invoice approval.
- Queue invoice sync writes `finance_integration_events` with `adapter_name='pending'`, event type `invoice_sync_requested`, and `manual_review_required=true`.
- It does not sync to Xero, QuickBooks, Tally, bank feeds, or payment processors.

Can I book freight from this screen?

- No.
- The screen can queue a pending freight request after packing approval.
- Queue freight request writes a pending freight request/event payload. It does not book a carrier or call Flexport, Freightos, DHL, or any carrier adapter.

Can you close this order?

- No.
- Setu Guru can explain the closeout checklist, but a human must record payment reference, reconcile, acknowledge receipt, archive documents, confirm no blockers, and click Close order.

Why is WhatsApp manual?

- No WhatsApp Business API is live.
- SetuFlow opens WhatsApp or WhatsApp Web with a prefilled tracked link.
- The operator manually sends the message.

How does PDF work?

- Free server rendering uses `puppeteer-core` plus `@sparticuz/chromium` where available.
- Generated files may use private Supabase Storage/signed URLs.
- Browser print fallback remains available from tracked preview pages.

## KPI filter answers

- All orders: all loaded execution orders.
- Ready now: loaded orders with no current blocker for the next best action.
- Blocked: loaded orders with execution blockers.
- Finance queue-ready: final invoice approved and invoice sync can be queued.
- Freight queue-ready: packing approved and freight payload complete.
- WhatsApp-ready docs: approved documents with a tracked link/manual WhatsApp path.

## Truthful CTA labels

Use these labels:

- Queue invoice sync
- Queue freight request
- View queue
- Copy payload
- Retry queued event
- Open WhatsApp manually
- Generate PDF / Browser print fallback
- Queue-ready
- Pending adapter
- Manual tracked link

Do not use these labels as current truth:

- Sync to QuickBooks
- Book freight
- Delivered via WhatsApp
- Connected to provider
- Live accounting sync
- Live carrier booking

## Approval boundary

Setu Guru may draft:

- blocker explanations;
- next-best-action explanations;
- dispatch evidence checklists;
- finance/freight queue readiness checklists;
- WhatsApp/email wording;
- PDF/preview instructions.

Setu Guru must not perform:

- actual line approval;
- order document approval;
- sending;
- waiving or confirming trade requirements;
- packing approval;
- freight request approval;
- dispatch/shipment status changes;
- invoice sync;
- payment reconciliation;
- order closeout;
- delete/archive/mutate commercial truth.
