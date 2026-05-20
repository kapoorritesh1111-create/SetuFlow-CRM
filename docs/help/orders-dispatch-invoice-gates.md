# Orders dispatch and final invoice gates help

Route: `/orders`
Owner: Setu Guru knowledge base
Last updated: 2026-05-20

## Sprint 8O purpose

Sprint 8O introduces the packing list, logistics/dispatch, shipment draft, and final invoice gate foundation for the additive Orders execution workflow.

This pass keeps the core Sprint 8 rule:

```text
Prepare → Preview → Approve → Send / Advance
```

It does not mutate quote history, does not auto-dispatch, and does not sync finance records. Sprint 18 finance behavior is pending-adapter queue only through `finance_integration_events`.

## What Sprint 8O adds

1. Packing List gate:
   - Prepare
   - Previewed
   - Approve
2. Logistics Documents gate:
   - Prepare
   - Previewed
   - Approve
3. Final Invoice gate:
   - Prepare
   - Previewed
   - Approve
4. Shipment Draft gate:
   - Creates a draft `shipments` record linked to the execution order.
   - Supports shipment mode, carrier, forwarder, booking reference, and tracking reference fields as a foundation.
5. Dispatch Release gate:
   - Requires an existing shipment draft.
   - Requires open required/blocking trade requirements for logistics/dispatch/docs-release stages to be reviewed first.
   - Marks shipment dispatched only after explicit human approval.
6. Order documents are recorded in `order_documents` when document gates are prepared.
7. Gate state is saved in `order_approval_gates`.
8. Stage history is recorded in `order_stage_events`.
9. Human approvals are audited where applicable.

## Final invoice policy

Setu Guru must explain that final invoice is different from proforma invoice.

- Proforma invoice supports buyer confirmation, advance payment, LC, or internal execution.
- Final invoice should be based on actual approved/dispatched quantities and dispatch posture.
- Queue invoice sync must not happen from draft, preview, or proforma documents.
- Queue invoice sync should only happen after Final Invoice approval and explicit human action. It creates a pending adapter event; it does not sync to Xero, QuickBooks, Tally, bank feeds, or payment processors.

## Dispatch policy

Dispatch must remain a human-approved gate.

Setu Guru must not:

- approve dispatch;
- mark a shipment dispatched;
- create or approve final invoice;
- waive open trade requirements;
- clear document blockers;
- send documents;
- queue or book freight without human action;
- close an order;
- sync finance records or claim accounting provider delivery.

Setu Guru may explain what is missing before dispatch and route the user back to the order.

## Regional vs export behavior

For regional/distribution orders:

- Logistics documents may mean delivery note, proof of delivery, local transport evidence, tracking reference, or buyer-required delivery evidence.
- Do not force export-only documents such as BOL, AWB, COO, insurance, or customs docs unless the order requirement rules say they apply.

For export/import orders:

- Logistics documents may include BOL/AWB, COO, insurance, inspection, customs, buyer/bank document set, or other order-specific requirements.
- Setu Guru should use attached trade requirements and source snapshots before declaring something required or blocking.

## Trade requirement dependency

Before logistics documents, final invoice, or dispatch release are approved, open required/blocking trade requirements for these stages should be reviewed:

- `trade_requirements`
- `logistics`
- `dispatch`
- `docs_release`
- `final_invoice`

Open means not confirmed, satisfied, or waived by a human reviewer.

## Data sources

- `orders`
- `order_lines`
- `packing_plans`
- `trade_requirements`
- `order_documents`
- `shipments`
- `order_approval_gates`
- `order_stage_events`

## Setu Guru response policy

When asked about dispatch/final invoice readiness, Guru should:

1. Check whether actual order lines exist.
2. Check whether packing sheet/packing list is prepared and approved.
3. Check whether trade requirements for logistics/dispatch/docs release are open.
4. Check whether shipment draft exists.
5. Explain whether final invoice should be prepared from ordered, loaded, dispatched, or delivered quantity context.
6. Keep regional/distribution and export/import workflows separate.
7. Avoid treating export documents as universal requirements.
8. Ask for explicit human approval before any state-changing action.

## Smoke-check checklist

- Does Packing List gate support Prepare, Previewed, and Approve?
- Does Logistics Documents gate support Prepare, Previewed, and Approve?
- Does Final Invoice gate support Prepare, Previewed, and Approve?
- Does Shipment Draft create a `shipments` record without dispatching automatically?
- Does Dispatch Release require a shipment draft?
- Does Dispatch Release check required/blocking trade requirements first?
- Are `order_documents`, `order_approval_gates`, and `order_stage_events` updated?
- Is quote history untouched?
- Are quote/compliance/catalog/lead protected flows untouched?

## Suggested prompts

- Is this order ready for packing list approval?
- What logistics documents are open for this order?
- Is dispatch blocked by trade requirements?
- Explain final invoice readiness for this order.
- What is the difference between proforma and final invoice?
- What must happen before I dispatch this order?
