# Orders help

Route: `/orders`
Owner: Setu Guru knowledge base
Last updated: 2026-05-12

## Purpose

Use Orders after quote acceptance to manage execution readiness, release evidence, dispatch documents, shipment progress, and order closeout. Orders should make it clear that an accepted quote is commercially important, but it is not the same as being ready to release, dispatch, or close execution.

## Sprint 8T packing, freight, dispatch, and closeout UI

Sprint 8T adds a logistics/dispatch readiness panel below the structured Orders execution workspace.

New behavior:

1. The panel reads live structured execution tables:
   - `packing_plans`
   - `freight_rate_requests`
   - `freight_rate_quotes`
   - `shipments`
   - `order_documents`
   - `finance_sync_records`
2. Each order now shows five execution lanes:
   - Packing
   - Freight
   - Shipment
   - Dispatch invoice
   - Finance closeout
3. The panel shows whether packing is approved, freight quote is selected, shipment is planned/dispatched/delivered, dispatch invoice evidence exists, and finance sync/receipt closeout exists.
4. The panel surfaces blockers such as missing packing plan, unapproved packing, missing freight request, unselected freight quote, missing shipment booking, missing dispatch invoice, and missing finance closeout.
5. The panel is read-first and approval-safe. It does not auto-approve packing, send freight requests, book shipment, dispatch, invoice, sync finance, or close orders.
6. Quote history is not mutated.

Setu Guru should explain that Sprint 8T makes the downstream execution truth visible. It is not an external logistics/finance integration yet. It reads readiness from structured records and helps the operator understand what is missing before dispatch and closeout.

## Sprint 8S order document gates and send tracking

Sprint 8S adds the first structured order-document send gate on top of the Sprint 8R stage shell.

New behavior:

1. Order document send state is persisted in `order_documents`.
2. Send activity is recorded in `order_stage_events`.
3. The stage panel now includes **Send tracked** after Prepare, Previewed, and Approve controls.
4. The supported first-document types are:
   - `order_confirmation` for regional orders.
   - `proforma_invoice` for export orders.
   - `dispatch_invoice` for later dispatch invoice work.
5. Sending records channel, recipient, note, source quote ID, and source quote version ID in the document snapshot.
6. If no current document tracking row exists, the send action creates an approved `order_documents` row before marking it sent.
7. Send tracking works from structured `orders`, not legacy contract-only workflow.
8. Quote history is not mutated.

Important limitation for this pass:

- Sprint 8S persists send/open-tracking state and records stage events, but it does not yet rebuild final buyer-facing PDF design or external email/WhatsApp transport. The button records the structured send event and returns to Orders.

Setu Guru should explain that Sprint 8S introduces the workflow truth for order documents: **Prepare → Preview → Approve → Send tracked**. Guru must not say a document has been externally delivered unless a future transport integration or explicit external send confirmation exists.

## Sprint 8R structured Orders stage shell

Sprint 8R makes the Orders workspace structured-order first.

New behavior:

1. The Orders workspace is now driven by live `orders` records first, not by quote/contract fallback rows.
2. The left queue opens one structured order at a time.
3. The open order workspace shows accepted quote-version lineage, source version health, actual order lines, next action, and blockers.
4. The stage strip uses the full execution-stage model:
   - Quote Approved
   - Actual Lines
   - Packing Sheet
   - Freight Request
   - Order Confirmation
   - Proforma Invoice
   - Trade Requirements
   - Shipment Booking
   - Dispatch Invoice
   - Completed
5. Orders show the accepted quote-version/source version badge and warn when the order source version does not match the quote `accepted_version_id`.
6. Health checks look at source version, actual lines, gates, documents, and stage blockers.
7. The legacy quote/contract-only workflow is explicitly deprecated for new execution. It can remain readable for old records, but new execution should use structured `orders`, `order_lines`, gates, documents, and order-stage requirements.
8. Quote history is not mutated.

Setu Guru should explain that Sprint 8R is a UI shell alignment pass: the queue, workspace, stage strip, source-version card, and stage action panel now reflect the workflow documented in the roadmap and seeded test data. Guru must not suggest creating buyer-facing execution documents from a merely sent quote or from a mismatched quote version.

## Sprint 8M packing sheet and freight rate request foundation

Sprint 8M adds the first packing and freight/delivery rate request foundation on the additive Orders execution schema.

New behavior:

1. **Packing sheet** supports Prepare → Previewed → Approve.
2. Packing sheet templates now include Regional truck, 20ft container, 40ft container, and Custom.
3. The first packing plan is created from actual order lines, not quote history.
4. Packing plan lines capture the starting logistics structure: SKU/product snapshot, cartons, units per carton, pallet fields, weights, dimensions, CBM, marks, and notes.
5. **Freight rate request** supports Prepare → Previewed → Approve.
6. Freight request supports Road, Sea, Air, and Courier modes and Email, WhatsApp, Manual, or Integration-ready request method.
7. Freight request records link to the approved packing plan and are ready for email/WhatsApp fallback first, with future integration adapters using the same record.
8. Gate state is saved in `order_approval_gates` and stage changes are recorded in `order_stage_events`.
9. Quote history is not mutated.
10. No freight request is sent automatically; human preview/approval remains required.

Setu Guru should explain that packing sheet is the logistics input for freight/delivery rates. A quote or order confirmation does not contain enough operational packing data by itself. The operator should prepare the packing sheet, preview it, approve it, then prepare/preview/approve the freight request. Guru must not mark a packing sheet approved, send a rate request, choose a freight quote, book shipment, dispatch, or clear documents without explicit human action.

For export orders, Guru should explain that container templates are only a starting estimate. The organization may still need product-specific packing templates, pallet pattern, carton dimensions, net/gross weight, CBM, marks and numbers, loading notes, temperature or handling requirements, and buyer/logistics instructions before final logistics booking.

For regional/distribution orders, Guru should explain that the same flow works without forcing export documents: Regional truck or Custom packing can support local delivery, courier, or domestic freight rates.

## Sprint 8L internal approval and first document gates

Sprint 8L adds the first explicit approval gates on the new additive Orders execution schema.

New behavior:

1. **Approve actual lines** records human internal approval for actual buyer order lines.
2. **Regional document gate** supports Order Confirmation: Prepare → Previewed → Approve.
3. **Export document gate** supports Proforma Invoice: Prepare → Previewed → Approve.
4. Gate state is saved in `order_approval_gates`.
5. Gate changes create `order_stage_events` and audit records where approval occurs.
6. The action works on the execution `orders` record created from the approved quote in Sprint 8K.
7. Quote history is not mutated.
8. Legacy Generate order PDF, Generate invoice, and send-link controls remain available while the new workflow is introduced gradually.

Setu Guru should explain that this pass introduces workflow control, not final document redesign. Operators should prepare actual order lines first, approve those lines internally, then prepare/preview/approve either Regional Order Confirmation or Export Proforma Invoice before sending. Guru must not approve a gate, mark a preview complete, send a document, waive a requirement, or change order lines without explicit user action.

## Sprint 8K actual order lines from approved quote

Sprint 8K starts the additive Orders execution workflow on the new schema while keeping legacy contracts and quote history untouched.

New behavior:

1. Open an order from the Orders queue.
2. Use **Prepare actual lines** to create a new execution `orders` record and `order_lines` from the approved quote or linked contract.
3. The action is idempotent: if the execution order already exists, it returns to the same order instead of duplicating lines.
4. Actual order lines preserve source lineage to the quote version line and/or contract line.
5. Quote history is not changed.
6. The prepared order starts in the `quote_approved` stage with an `actual_lines` approval gate in prepared state.
7. An order stage event and audit log entry are created so the handoff is traceable.

Setu Guru should explain that this is the first step in the approved `Orders Full Redesign Approval Walkthrough`: an approved quote becomes editable execution lines before future preview/approve/send gates. Guru must not describe quote lines as final buyer order truth. The buyer may buy fewer, more, or different items than the quote, and future passes will let the user review/edit/approve those lines before sending Order Confirmation or Proforma documents.

Setu Guru must also explain that Sprint 8K does not yet replace the legacy order PDF/invoice actions. Those remain available while the new execution-order schema is introduced gradually.

## Best for

- Turning accepted quotes into controlled execution work.
- Tracking accepted quote-version lineage, actual order lines, packing, freight, document readiness, release readiness, send state, shipment, dispatch, finance sync, and closeout posture.
- Separating accepted quote status from fulfillment readiness.
- Managing order documents without changing accepted quote terms.
- Giving operators a clear next action after quote acceptance.

## Common questions Setu Guru should answer

- What is blocking this order?
- Is this order commercially accepted but not execution-ready?
- Which quote version is the source for this order?
- What stage is this order in?
- Has the order confirmation or proforma been sent/tracked?
- Is packing approved for this order?
- Has a freight quote been selected?
- Is shipment booked, dispatched, or delivered?
- Is the dispatch invoice evidence present?
- Is finance sync or receipt closeout complete?
- What evidence is missing before dispatch?
- Which documents are advisory, required, expired, or pending review?
- Is this a commercial, payment, document, compliance, packing, freight, or dispatch blocker?
- What is the next safe execution action?
- Where do I get the quote PDF, order confirmation, and invoice?
- Why is order upload not accepting my file?
- Why do I need to prepare actual order lines after quote approval?
- Can buyer order quantities differ from the quote?
- What does internal order approval mean?
- What is the difference between Order Confirmation and Proforma Invoice?
- What information is needed for a packing sheet?
- How do I request freight or delivery rates?

## Common blockers

- Accepted quote has not been converted or linked correctly.
- Order source quote version does not match the quote `accepted_version_id`.
- Commercial lock, payment status, or release readiness is incomplete.
- Actual order lines have not been prepared from the approved quote yet.
- Actual order lines have not been internally approved yet.
- First document gate has not been prepared, previewed, approved, or sent/tracked.
- Packing sheet has not been prepared, previewed, or approved.
- Freight/delivery rate request has not been prepared, previewed, or approved.
- Freight quote has not been selected.
- Shipment booking is missing.
- Dispatch invoice document evidence is missing.
- Finance sync or receipt closeout is missing.
- Dispatch evidence is missing or pending review.
- Order-stage trade requirement is open, expired, or advisory but unresolved.
- Dispatch documents are being treated as quote-send blockers instead of order execution readiness items.
- Order confirmation and invoice workflow is unclear after contract signing.
- User wants to advance order state without required evidence or human approval.

## Data sources

- Structured `orders` records.
- `order_lines` actual buyer order lines.
- Accepted quote and accepted quote version.
- `quote_version_line_items` as the accepted commercial source snapshot.
- `order_documents` for prepare/approve/send/open tracking state.
- Order approval gates and order stage events.
- Packing plans and packing plan lines.
- Freight rate requests and freight rate quotes.
- Shipments.
- Finance sync records.
- Documents attached to order, lead, quote, or dispatch.
- Order-stage trade requirements and document requirement rules.
- Buyer/supplier and shipment notes.
- Payment, release, fulfillment, and dispatch status fields where available.

## Allowed actions

- Explain execution readiness and next action.
- Route to order document upload, Compliance Assist, or the linked lead/quote.
- Explain accepted quote-version lineage and source version health.
- Explain order document send status when recorded in `order_documents`.
- Explain packing, freight, shipment, dispatch invoice, and finance closeout readiness from structured records.
- Explain that actual order lines are prepared from the approved quote without mutating quote history.
- Explain internal approval and first document gate steps.
- Explain packing sheet and freight/delivery request steps.
- Separate commercial, payment, document, compliance, packing, freight, shipment, finance, and dispatch blockers.
- Draft an evidence checklist for human review.
- Explain the approval boundary before a user advances order execution.
- Explain the quote PDF → actual lines → internal approval → order confirmation/proforma → packing sheet → freight request → dispatch invoice sequence.

## Setu Guru order action buttons

Order actions are guidance and routing only unless a future approved pass adds an explicit approval-safe write path. Current safe behaviors:

- **Open Orders** routes to the Orders workspace.
- **Check order blockers** asks Setu Guru to inspect commercial, payment/release, document, compliance, packing, freight, shipment, finance, and dispatch blockers without advancing order state.
- **Draft dispatch evidence checklist** queues a checklist prompt in the composer.
- **Review order approval boundary** explains which order actions require human approval.

## Approval rules

Setu Guru must not advance order states, approve release, waive compliance, send dispatch documents, delete evidence, or change accepted commercial terms without human approval.

Setu Guru may explain what a human reviewer should check, but it must not perform or imply approval for:

- release approval;
- dispatch approval;
- compliance waiver;
- payment clearance;
- order closeout;
- document deletion;
- accepted quote term changes;
- editing actual order lines without user confirmation;
- marking internal review or first document gates complete without user action;
- approving a packing sheet;
- sending or approving a freight/delivery rate request;
- selecting a freight quote or booking a shipment;
- marking shipment dispatched or delivered;
- syncing finance or closing payment/receipt.

## Response policy

Use live order context first when available. If only dashboard context is available, explain the likely blocker category and route the user to the exact order or execution queue. Success/failure messages should say whether Setu Guru queued guidance, routed the user, or could not complete the action.

When no live order context is visible, Setu Guru should ask the user to open the order or provide the order reference before giving record-specific status. It may still explain the readiness lanes and the safest next route.

## Sprint 8T smoke-check checklist

Use this checklist before the next Orders pass:

- Does the logistics readiness panel load below the structured Orders workspace?
- Does it read `packing_plans`, `freight_rate_requests`, `freight_rate_quotes`, `shipments`, `order_documents`, and `finance_sync_records`?
- Does each order show Packing, Freight, Shipment, Dispatch invoice, and Finance closeout lanes?
- Does it surface blockers for missing/unapproved packing, missing freight, unselected freight quote, missing shipment booking, missing dispatch invoice, and missing finance closeout?
- Does it remain read-first and avoid auto-approving or mutating execution state?
- Does quote history remain untouched?
- Are quote/compliance/catalog/lead protected flows untouched?

## Sprint 8S smoke-check checklist

Use this checklist before the next Orders pass:

- Does the stage panel show Send tracked after Prepare, Previewed, and Approve?
- Does Send tracked create or update an `order_documents` row?
- Does the row store status `sent`, sent timestamp, recipient, channel, note, source quote ID, and source quote version ID?
- Does send create an `order_stage_events` record?
- Does the send action work from structured `orders`, not contract-only fallback?
- Does quote history remain untouched?
- Are quote/compliance/catalog/lead protected flows untouched?

## Sprint 8R smoke-check checklist

Use this checklist before the next Orders pass:

- Does the Orders workspace load from structured `orders` records first?
- Does the left queue show structured orders, not quote-only fallback rows?
- Does the open order workspace show accepted quote-version/source version health?
- Does the stage strip show the 10-stage model?
- Does the active stage match `orders.current_stage`?
- Does the line workspace compare accepted quote-version lines to actual `order_lines`?
- Does the stage panel show the next safe gate action?
- Does the UI label legacy quote/contract-only workflow as deprecated for new execution?
- Does quote history remain untouched?
- Are quote/compliance/catalog/lead protected flows untouched?

## Suggested prompts

- What is blocking this order?
- Is this order ready for dispatch?
- Which quote version created this order?
- Has this order confirmation been sent?
- Is packing approved for this order?
- Has freight been selected for this order?
- Is shipment booked or dispatched?
- Is dispatch invoice evidence ready?
- Is finance closeout synced?
- Which evidence is missing before release?
- Is this a quote issue or an order execution issue?
- Where do I create the order confirmation and invoice?
- Why is my order upload not working?
- Draft a dispatch evidence checklist.
- Explain the approval boundary for this order.
- Explain actual order lines after quote approval.
- Explain the first document gate for this order.
- Explain the packing sheet for this order.
- Explain the freight rate request for this order.
