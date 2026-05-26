# Sprint 18 Orders Execution Cockpit and integration-ready guide

Last updated: 2026-05-20

## Canonical answer

The Orders Execution Cockpit is the real execution workspace after quote acceptance. It is not a Quote clone. It manages actual buyer order lines, buyer documents, packing, freight queue readiness, processing, delivery note, final invoice, finance queue readiness, payment, and closeout.

The eight stages are:

```text
Actual Lines -> Buyer Doc -> Packing -> Freight Queue -> Processing -> Delivery Note -> Final Invoice -> Paid & Closed
```

## Actual Lines: live Catalog product add flow

Actual Lines can add a product from live Catalog pricing after quote acceptance. This must preserve accepted quote immutability while recording the buyer's actual execution truth.

Current production behavior:

- `/orders` server-renders Catalog options from `active_product_pricing_rules_v` in `src/app/(app)/orders/layout.tsx`.
- Options are scoped to the verified workspace organization.
- The loader tries active quoteable pricing rules first, then active rules.
- If the authenticated query path fails while workspace membership and organization are already verified, the loader may use the service-role/admin client as a verified-organization fallback. This fallback must remain strictly scoped by `organization_id`.
- The product option label should expose product name, pack label, SKU/code, HSN/HS code, pricing type, price basis, and price.
- The add-line form submits `catalog_pricing_rule_id`.
- `addManualActualOrderLineAction` re-resolves the selected rule in `src/features/orders/server/order-integrations.ts` using the same verified-organization pattern, scoped by `organization_id` and selected rule id.
- Catalog-linked inserted rows use `change_type='added_catalog_after_quote'`.
- The inserted line preserves catalog/pricing lineage through product and pricing snapshots, including product/variant IDs, SKU, HSN, pricing type, price basis, price columns, and FX metadata where available.
- If unit price is blank, the server resolves a default from the selected Catalog rule.
- Manual lines are separate, not catalog-linked, and require reason/context.
- Removed added/manual lines should be deleted from active `order_lines` rendering and remain only in audit/activity history.
- Accepted quote versions and accepted quote line items are never mutated by actual line edits.

Do not fake catalog products. Do not use rows from another organization. If products are missing while the organization has active pricing rows, investigate the loader/action query path, RLS, session, or workspace context.

## Required Setu Guru answers

What is blocking this order?

- Check the Action Stack, blocker list, and latest activity.
- Separate accepted quote/source lineage, actual lines, first buyer document, packing, freight payload, processing/QC, delivery note, final invoice, finance queue, payment/reconciliation, archive, and trade requirement blockers.

What should I approve before sending the first order document?

- Actual order lines.
- Line discount and total order discount reasons/context.
- Actual-lines approval gate.
- Do not mutate accepted quote version lines.

How do I add a product after quote acceptance?

- Use Actual Lines -> Add catalog product.
- Pick a live Catalog pricing row for the same organization.
- Search by product name, SKU/code, HSN/HS code, pack label, pricing type, or price basis.
- Enter quantity, unit price if needed, and reason/context.
- Submit Add line.
- The server re-verifies the pricing rule and stores catalog/product/pricing snapshots on the actual order line.

Why did a product show but fail to add earlier?

- The loader and submit action must use the same verified-organization lookup pattern. If the loader can show a Catalog rule but the submit action cannot re-read it, the add-line action is broken. Fix the action query path; do not add fake options.

Should removed lines still show in Actual Lines?

- No. Removed added/manual lines should not appear as active or editable lines. They should remain only in audit/activity history.

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
- Add catalog product
- Manual line

Do not use these labels as current truth:

- Sync to QuickBooks
- Book freight
- Delivered via WhatsApp
- Connected to provider
- Live accounting sync
- Live carrier booking
- Catalog product added from another organization

## Approval boundary

Setu Guru may draft:

- blocker explanations;
- next-best-action explanations;
- dispatch evidence checklists;
- finance/freight queue readiness checklists;
- WhatsApp/email wording;
- PDF/preview instructions;
- Catalog line picker explanations;
- manual line reason/context guidance.

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
- delete/archive/mutate commercial truth;
- creating fake products;
- bypassing organization-scoped Catalog verification.
