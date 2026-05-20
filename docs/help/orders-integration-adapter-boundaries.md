# Orders integration adapter boundaries help

Route: `/orders`
Owner: Setu Guru knowledge base
Last updated: 2026-05-20

## Sprint 18 active boundary

The active Orders UI exposes Finance and Freight as pending-adapter queues only.

- Queue invoice sync writes `finance_integration_events` with `adapter_name='pending'` and `event_type='invoice_sync_requested'`.
- Queue freight request writes pending freight request/event payloads with `adapter_name='pending'` and `event_type='freight_quote_requested'`.
- Retry queued event only updates pending retry state. It does not call an external provider.
- Copy payload is for manual review.
- Mark manually completed/record manual reference is a human closeout note, not provider delivery confirmation.

No live Xero, QuickBooks, Tally, Flexport, Freightos, DHL, carrier booking, bank feed, payment processor, or WhatsApp Business API integration is live.

## Sprint 8P purpose

Sprint 8P defines safe freight and finance adapter boundaries for the additive Orders execution workflow.

This pass does **not** turn on external integrations by default. It creates explicit interfaces, disabled adapters, and pending queue events so future integrations can plug into the workflow without changing core Orders logic or causing regression.

## Freight boundary

Freight integrations must use the existing Orders execution data:

- `freight_rate_requests`
- `freight_rate_quotes`
- `packing_plans`
- `packing_plan_lines`
- `shipments`
- `order_stage_events`
- `order_approval_gates`

The safe sequence is:

```text
Packing Sheet approved
→ Freight Rate Request prepared
→ Previewed
→ Approved
→ Adapter quote request may run in future
→ Human selects quote
→ Human books shipment
→ Human approves dispatch
```

Freight adapter methods are defined as:

- `quote()`
- `book()`
- `track()`
- `documents()`

Sprint 8P uses a disabled adapter by default. It returns safe disabled payloads and performs no carrier booking, no live quote request, no tracking call, and no document fetch.

## Finance boundary

Finance integrations must not sync from quote, proforma, order confirmation, packing sheet, freight request, or draft invoice.

The safe sequence is:

```text
Final Invoice prepared
→ Previewed
→ Approved
→ Explicit finance integration approval
→ createInvoice()
→ Payment received
→ recordPayment()
→ Receipt/archive
```

Finance adapter methods are defined as:

- `createInvoice()`
- `updateInvoice()`
- `recordPayment()`
- `voidInvoice()`
- `syncCustomer()`

Sprint 8P uses a disabled adapter by default. It creates no external invoice, payment, customer, or accounting mutation.

## Setu Guru policy

Setu Guru may explain integration readiness, adapter boundaries, and why sync is disabled by default.

Setu Guru must not:

- book freight;
- send freight requests;
- select freight quotes;
- sync invoices;
- sync payments;
- sync customers;
- void finance documents;
- dispatch orders;
- close orders;
- bypass human approval gates.

## Future implementation rules

Before enabling a real freight adapter:

1. Confirm packing sheet approval.
2. Confirm freight rate request approval.
3. Store external quote response in `freight_rate_quotes`.
4. Require human quote selection.
5. Record all actions in `order_stage_events`.
6. Never auto-dispatch.

Before enabling a real finance adapter:

1. Confirm final invoice approval.
2. Confirm invoice quantity is based on actual dispatched/shipped/delivered context, not only quote quantity.
3. Write `finance_integration_events` or the approved future adapter ledger.
4. Require human finance approval.
5. Never sync proforma as a real invoice by default.

## Smoke-check checklist

- Are freight and finance adapters disabled by default?
- Does the freight boundary use packing/freight request records rather than direct external calls?
- Does the finance boundary block sync before final invoice approval?
- Does Guru explain integration readiness without performing integration actions?
- Are quote history, quote Review compliance, Catalog Admin/import, lead filters, and dashboard map untouched?
