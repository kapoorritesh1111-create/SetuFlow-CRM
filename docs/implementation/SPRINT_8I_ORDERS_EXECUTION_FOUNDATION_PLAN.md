# Sprint 8I — Orders execution workflow foundation plan

Last updated: 2026-05-11
Owner: Ritesh Kapoor
Sprint: Sprint 8 — Industry-neutral Orders execution workflow
Approved UX anchor: **Orders Full Redesign Approval Walkthrough**

---

## 1. Decision

Sprint 8I is a planning-only pass. It introduces no schema, UI, API, RLS, or production behavior changes.

SETU Flow Orders must become an industry-neutral execution workflow for import/export and regional distribution organizations. It must not become a food-only compliance workflow and must not continue as a set of one-off PDF buttons.

Future Orders UI must preserve the approved HTML pattern:

```text
Order queue on the left
→ one open order on the right
→ stage strip
→ stage-specific action panel
→ Prepare / Preview / Approve / Send or Advance gates
```

---

## 2. Current production state reviewed

Latest baseline reviewed:

```text
Deployment: dpl_8b2g5iz6zQQ5gx2EsC24L7a6VM4S
Commit: 1081790ab3fdafddacecf12c3d256fde0a77163f
Status: READY
```

Reviewed surfaces:

- roadmap/control docs
- `src/app/(app)/orders/page.tsx`
- `src/features/orders/components/OrderDetailPanel.tsx`
- `src/features/orders/server/actions.ts`
- `src/lib/order-execution.ts`
- `src/lib/order-operations.ts`
- `src/lib/document-requirements.ts`
- current Supabase schema for quotes, quote versions, contracts, contract line items, documents, compliance, communications, freight profiles, integrations, products, variants, categories, countries, HS/HSN tables, audit/activity/tasks

Current useful foundations:

- `quote_versions` and `quote_version_line_items` are the commercial quote source of truth.
- `contracts` is the current accepted quote / order compatibility shell.
- `contract_line_items` preserves continuity to quote lines.
- `documents` can attach files to quote, lead, or contract.
- `communications`, `lead_activities`, `scheduled_tasks`, and `audit_logs` support tracked communication and follow-up patterns.
- Freight seed tables and integration seed tables already exist.
- Product and variant records already contain category, HSN/HS fields, country of origin, packaging, shipment notes, export metadata, shipment attributes, weights, and units-per-case style fields.

Current gaps:

- No first-class `orders` table separate from `contracts`.
- No actual order line model that can differ from quote line selection/quantity.
- No structured approval gate table.
- No order-stage event trail.
- No industry-neutral trade requirement model scoped to order/stage/product/country/HS/order type.
- Existing `lead_compliance_items` is lead-scoped and should not become the order execution requirement engine.
- No structured packing plan, packing plan lines, freight rate request/quote, shipment, or finance sync boundary.
- Existing order/invoice PDF routes are proof-of-concept outputs, not the core workflow.

---

## 3. Product model

SETU Flow must support:

- regional distribution
- domestic wholesale
- cross-border trade
- import/export trading
- consumer goods
- food/agriculture
- textiles/apparel
- electronics
- industrial goods
- chemicals where permitted
- building materials
- packaging
- private-label products

Food/agri documents such as COA, phytosanitary, shelf-life, batch expiry, or food inspection must never be universal blockers. They become requirements only when matched by product/category/HS/country/buyer/bank/shipment/org rule/live lookup.

Use generic language:

```text
trade requirement
order requirement
document requirement
requirement source
requirement evidence
```

---

## 4. Target workflow

Every serious order document follows:

```text
Prepare → Preview → Approve → Send / Advance
```

Regional/distribution workflow:

```text
Approved quote
→ Confirm actual buyer order lines
→ Internal approval gate
→ Preview / approve / send Order Confirmation
→ Packing Sheet for delivery rate request
→ Preview / approve / send delivery/freight request
→ Pick / Pack / QC confirmation
→ Delivery Note / Proof of Delivery
→ Final / Tax Invoice preview / approve / send
→ Payment
→ Receipt + archive
→ Paid & Closed
```

Export/import workflow:

```text
Approved quote
→ Confirm actual Proforma lines
→ Internal approval gate
→ Preview / approve / send Proforma Invoice
→ Packing Sheet for freight/container/truck rate request
→ Preview / approve / send freight request
→ Processing and Packing List
→ Logistics / shipping / customs documents
→ Dispatch and Final Commercial Invoice preview / approve / send
→ Document Set release to buyer/bank where applicable
→ Payment
→ Receipt + archive
→ Paid & Closed
```

Approved quote is the input, not the final order. Actual order lines can include/exclude quote items, change quantities, add confirmed items, change packaging/shipment assumptions, and preserve source quote references. Quote history must not be mutated.

---

## 5. Additive schema plan

Sprint 8J should add schema only. No existing behavior should depend on these tables until later passes.

Proposed additive tables:

```text
orders
order_lines
order_approval_gates
order_stage_events
order_documents
trade_requirement_rules
trade_requirements
trade_requirement_sources
packing_plans
packing_plan_lines
freight_rate_requests
freight_rate_quotes
shipments
finance_sync_records
```

### orders

First-class execution order record. Links to lead, source quote, source quote version, and optional legacy contract. Fields should include organization, order type, current stage, status, approval state, currency, pricing basis, incoterm, payment terms, origin/destination country, origin/destination place, destination port, buyer reference, notes, total value, created/updated metadata.

Initial visible order types can be Regional and Export, but schema should allow:

```text
regional
export
import
distribution
custom
```

### order_lines

Actual buyer order lines. Initialized from quote/version/contract lines but editable under approval. Must store source quote line, source contract line, product/variant/category snapshots, HS/HSN, quoted quantity, ordered quantity, approved quantity, packed quantity, loaded quantity, dispatched quantity, delivered quantity, unit price, line total, change type, change reason, pricing snapshot, and product snapshot.

Important rule: final invoice uses dispatched/shipped quantity, not quoted quantity.

### order_approval_gates

Enforces Prepare / Preview / Approve / Send / Advance. Gate types:

```text
actual_lines
order_confirmation
proforma_invoice
packing_sheet
freight_rate_request
packing_list
logistics_docs
delivery_note
shipping_docs
final_invoice
document_set
receipt
closeout
```

Statuses:

```text
draft
prepared
previewed
approved
rejected
sent
opened
completed
cancelled
superseded
```

### order_stage_events

Immutable event trail for stage changes, approvals, sends, opens, waivers, deferrals, freight requests, dispatch, payment, and closeout.

### order_documents

Typed wrapper for generated/uploaded/approved/sent/opened documents. Links to `orders`, optional legacy contract, optional `documents`, approval gate, document type, stage, status, version, source snapshot, generation snapshot, approval/send/open timestamps.

Document types must be generic, including:

```text
order_confirmation
proforma_invoice
packing_sheet
freight_rate_request
packing_list
delivery_note
proof_of_delivery
shipping_documents
bill_of_lading
air_waybill
certificate_of_origin
insurance_certificate
inspection_certificate
quality_certificate
safety_certificate
regulatory_certificate
final_invoice
commercial_invoice
document_set
receipt
other
```

### trade_requirement_rules

Reusable industry-neutral rules by order type, stage, origin/destination country, market, category, product, variant, HS/HSN, shipment mode, incoterm, source, and validity.

Requirement types:

```text
commercial_document
customs_document
transport_document
origin_document
quality_document
safety_document
regulatory_document
finance_document
buyer_requested_document
bank_requested_document
internal_approval
logistics_requirement
other
```

Severity values:

```text
advisory
required_before_send
required_before_booking
required_before_dispatch
required_before_docs_release
blocking
```

### trade_requirements

Instantiated requirements attached to a specific order/stage/line. Status values:

```text
pending
not_needed
requested
attached
approved
waived
deferred
blocked
superseded
```

### trade_requirement_sources

Stores live search/source snapshots for audit: source type/name/url/title, checked date, query context, source snapshot, confidence, confirmed by/at.

### packing_plans and packing_plan_lines

Structured packing data first, document second. Must support regional truck, 20ft, 40ft, courier/pallet/bulk later, and custom org/product templates.

Packing plan fields should include plan type, template key, container/vehicle type, status, total pallets, master cases, inner boxes, units, net/gross weight, CBM, assumptions, preview, approval metadata.

Packing plan lines should store SKU/product snapshots, cartons, units per carton, inner boxes, units per inner box, pallets, cases per pallet, pallet pattern, net/gross weight, dimensions, CBM, marks/numbers, notes.

### freight_rate_requests and freight_rate_quotes

Freight requests support manual/email/WhatsApp fallback first and future integration later. Fields should cover order, packing plan, request method, shipment mode, incoterm, pickup/delivery, origin/destination country and port, requested-to snapshot, payload, sent time, selected quote.

Freight quotes store provider, quote amount, currency, transit days, service level, validity, payload, selected metadata.

### shipments

Movement booking/tracking: mode, carrier/forwarder, booking reference, BOL/AWB, tracking, planned/loaded/dispatched/delivered timestamps, status and payload.

### finance_sync_records

Safe accounting boundary. Drafts, internal approvals, packing sheets, freight requests, and Proformas should not create real accounting invoices by default. The safe sync point is after final invoice preview/approval and dispatch/shipped quantity validation.

---

## 6. Compatibility strategy

Do not remove or repurpose current `contracts` and `contract_line_items` in Sprint 8J.

Mapping:

```text
orders.legacy_contract_id → contracts.id
orders.source_quote_id → quotes.id
orders.source_quote_version_id → quote_versions.id
order_lines.source_contract_line_item_id → contract_line_items.id
order_lines.source_quote_version_line_item_id → quote_version_line_items.id
```

Future Orders route switch:

```text
If an order record exists:
  render new execution workflow
Else:
  render legacy contract/order compatibility view
```

Initial backfill must be manual/controlled later:

1. Create an `orders` row for each contract only when needed.
2. Copy references and snapshots; do not mutate quote/contract history.
3. Create order lines preserving source quote/contract references.
4. Log backfill in `order_stage_events` or `audit_logs`.

---

## 7. Guardrail changes

Keep protected:

- quote continuation
- quote PDF/share/send
- quote Review compliance
- Catalog Admin/import/product cleanup
- lead row Open / More
- Source Event narrowing
- country/market correctness
- dashboard map auto-focus/reset

Loosen only inside Orders:

1. Contract lines do not equal final order lines.
2. Document generation alone cannot advance execution.
3. Lead/quote compliance is not the same as order-stage trade requirements.
4. Packing List is advisory before quote-send but can be required in Orders before freight/dispatch depending on rules.
5. Final invoice must be based on dispatched/shipped quantity, not quote/contract quantity.

---

## 8. Live trade requirement search architecture

Goal: help the organization discover and attach requirements by origin/destination country, order type, shipment mode, incoterm, product/category, HS/HSN, buyer/bank requirement, and organization template.

Source types:

```text
official_source
trade_portal
customs_source
buyer_request
bank_lc_requirement
freight_forwarder_requirement
organization_rule
manual_reviewer_note
ai_suggested_search
```

Flow:

1. Setu Guru or UI prepares search context.
2. User reviews source result.
3. System stores source snapshot.
4. User attaches requirement to order/stage.
5. Requirement severity controls advisory/required/blocking state.
6. Waive, defer, and not-needed require human reason and audit.

Setu Guru can suggest and summarize requirements. It must not silently approve, waive, clear, send, delete, dispatch, close, sync finance, or attach requirements without human approval.

---

## 9. Packing, freight and finance integration boundaries

Packing Sheet workflow:

```text
Prepare packing plan
→ Preview packing sheet
→ Approve packing sheet
→ Send freight/delivery rate request
→ Receive quote
→ Select quote
→ Continue to processing/logistics
```

Initial freight method:

```text
Email / WhatsApp secure tracked request link
```

Future freight adapter:

```text
FreightAdapter.quote()
FreightAdapter.book()
FreightAdapter.track()
FreightAdapter.documents()
```

Finance safe sync:

| SETU stage | Finance behavior |
| --- | --- |
| Quote Approved | No finance sync |
| Internal Approval | No finance sync |
| Proforma / Order Confirmation | Optional non-posting reference only |
| Packing Sheet / Freight Request | No finance sync |
| Final Invoice approved | Eligible for invoice sync |
| Payment received | Sync payment against invoice |
| Paid & Closed | Receipt/archive sync |

Future finance adapter:

```text
FinanceAdapter.createInvoice()
FinanceAdapter.updateInvoice()
FinanceAdapter.recordPayment()
FinanceAdapter.voidInvoice()
FinanceAdapter.syncCustomer()
```

---

## 10. RLS and permissions plan

All new tables must be organization-scoped.

Minimum policy:

- Workspace members can read rows for their organization.
- Sales/procurement/operations roles can create and update draft execution records.
- Approval actions require approval-capable role.
- Requirement waiver/defer/not-needed requires reason and permission.
- Finance sync requires admin/finance permission later.
- Integration configuration is admin-only.
- No cross-organization data exposure.

---

## 11. Setu Guru policy plan

Setu Guru must learn before UI implementation:

1. Orders are an execution workflow, not PDFs.
2. Regional/distribution differs from export/import.
3. Quote approval is input, not final order line truth.
4. Actual order lines can differ from quote lines.
5. Serious documents use Prepare / Preview / Approve / Send gates.
6. Trade requirements are industry-neutral, not food-only compliance.
7. Guru may suggest requirements by country/product/category/HS/order type, but must ask for confirmation before attaching.
8. Guru must not approve, waive, clear, send, delete, dispatch, close, or sync finance without human action.
9. Freight questions route to packing plan and freight rate request flow.
10. Finance questions route to final invoice/payment/receipt flow.

Future implementation should update:

- `docs/help/orders.md`
- `docs/setu-guru/*` if an Orders workflow knowledge file exists or is added
- `src/lib/setu-guru/page-context.ts`
- `src/lib/setu-guru/guru-response-policy.ts`

---

## 12. Regression plan

Sprint 8J should be schema-only unless separately approved. It must not change:

- quote builder
- quote PDF generation
- quote send/share
- quote Review compliance
- lead command center
- catalog admin/import/product cleanup
- current Orders route behavior
- generated order/invoice proof-of-concept routes
- authentication/workspace logic

Sprint 8J checks:

1. Migration applies cleanly.
2. Tables are organization-scoped.
3. RLS does not break login or existing routes.
4. Existing constraints are not weakened without reason.
5. Existing data is not mutated.
6. Vercel build remains READY.

Because Sprint 8J should be additive schema only, rollback risk should be low.

---

## 13. Implementation sequence after Sprint 8I

### Sprint 8J — Additive Orders execution schema foundation

- SQL migration for additive tables.
- RLS policies.
- Type/schema docs.
- No UI changes.
- Setu Guru order policy doc update.

### Sprint 8K — Actual order lines from approved quote

- Create execution order from accepted quote.
- Confirm actual lines and quantities.
- Preserve source quote and quote-version lineage.
- No mutation to quote history.

### Sprint 8L — Internal approval and first document gates

- Regional Order Confirmation gate.
- Export Proforma Invoice gate.
- Preview / approve / send tracked link.
- Open tracking and 2-day follow-up.

### Sprint 8M — Packing Sheet and Freight Rate Request

- Packing plan records.
- Regional truck, 20ft, 40ft, custom templates.
- Preview / approve packing sheet.
- Email/WhatsApp fallback freight request.

### Sprint 8N — Industry-neutral trade requirement search and attach

- Requirement search context.
- Source snapshot storage.
- Human-confirmed requirement attachment.
- Advisory/required/blocking severity gates.

### Sprint 8O — Packing List, logistics, dispatch, final invoice gates

- Packing list preview/approval.
- Packed-for-loading confirmation.
- Delivery/shipping docs by order type.
- Final invoice from actual dispatched/shipped quantity.
- Final invoice preview/approval/send.

### Sprint 8P — Integration adapter boundaries

- Freight adapter interface.
- Finance adapter interface.
- No external integration turned on by default.
- Safe sync records and audit events.

---

## 14. Next pass approval text

```text
APPROVED — Sprint 8J additive Orders execution schema foundation in one commit
```

Sprint 8J must be schema-only unless Ritesh explicitly expands scope.
