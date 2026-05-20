# Sprint 18 integration-ready help

Route: `/orders`
Owner: Setu Guru knowledge base
Last updated: 2026-05-20

## Active product truth

Sprint 18 implements the Orders Execution Cockpit v2 direction. Orders is an execution cockpit, not a quote clone.

Finance and Freight are integration-ready queues only. No live Xero, QuickBooks, Tally, Flexport, Freightos, DHL, carrier booking, bank feed, payment processor, or WhatsApp Business API integration is live.

## Orders Execution Cockpit stages

1. Actual Lines
2. Buyer Doc
3. Packing
4. Freight Queue
5. Processing
6. Delivery Note
7. Final Invoice
8. Paid & Closed

## Actual Lines: live Catalog product add flow

The Actual Lines stage can add products from live Catalog pricing after quote acceptance without mutating the accepted quote version.

Current production truth:

- `/orders` loads Catalog options server-side from `active_product_pricing_rules_v` in `src/app/(app)/orders/layout.tsx`.
- Catalog rows are scoped to the verified workspace organization.
- The loader tries active + quoteable rows first, then active rows.
- If the authenticated view/query path returns no rows while the workspace organization is verified, the loader may use a service-role/admin fallback scoped strictly to that same `organization_id`.
- The add-line server action re-verifies the selected `catalog_pricing_rule_id` in `src/features/orders/server/order-line-actions.ts` before insert.
- The submit action uses the same safe verified-organization fallback, scoped by `organization_id` and selected rule id, so products shown by the loader can also be inserted.
- Catalog-linked actual lines use `change_type='added_catalog_after_quote'` and preserve product/pricing lineage through snapshots.
- Manual lines remain separate and require reason/context.
- Removed added/manual lines should disappear from active Actual Lines UI and remain only in audit/activity history.

Setu Guru must not say Catalog is empty when live active/quoteable pricing rows exist. If products do not appear, treat it as a query/RLS/session/workspace context bug to investigate, not a reason to fake options.

## KPI meanings

- All orders: all loaded execution orders.
- Ready now: loaded orders with no current blocker for the next best action.
- Blocked: loaded orders with execution blockers.
- Finance queue-ready: final invoice is approved and invoice sync can be queued.
- Freight queue-ready: packing is approved and the freight payload is complete.
- WhatsApp-ready docs: approved documents with a tracked preview link path and manual WhatsApp path.

## Queue CTAs

Queue invoice sync creates a pending `finance_integration_events` payload with `adapter_name='pending'`, event type `invoice_sync_requested`, and `manual_review_required=true`. It does not sync to an accounting provider.

Queue freight request creates a pending freight request/event payload with `adapter_name='pending'`, event type `freight_quote_requested`, and `manual_review_required=true`. It does not book freight or call a carrier.

Retry queued event only updates pending retry state. It must not call an external provider.

Copy payload copies queue JSON for manual review. Payload JSON belongs in the queue drawer/inspector, not on the main screen.

## WhatsApp and PDF

WhatsApp is manual tracked link only. SetuFlow opens WhatsApp or WhatsApp Web with prefilled text containing:

```text
View secure document: https://www.setuflowcrm.com/order-documents/preview/...
```

The operator manually sends the message. Do not say WhatsApp Business API is live.

PDF remains free/open-source. Server rendering uses `puppeteer-core` plus `@sparticuz/chromium` where available, generated files may use private Supabase Storage/signed URLs, and browser print fallback remains available from tracked preview pages.

## Setu Guru boundaries

Setu Guru may explain, guide, draft checklists, and identify blockers.

Setu Guru must not silently approve, send, waive, close, delete, mutate commercial truth, queue/retry/complete events, sync finance, book freight, or claim provider delivery.

Human approval is required for actual order lines, order document approval, trade requirement confirmation/waiver, packing approval, freight request approval, shipment/dispatch status changes, finance sync/payment closeout, and order closeout.
