# Orders help

Route: `/orders`
Owner: Setu Guru knowledge base
Last updated: 2026-05-12

## Purpose

Use Orders after quote acceptance to manage execution readiness, documents, trade requirements, packing, freight, shipment, dispatch invoice, payment, and closeout. Orders should make it clear that an accepted quote is commercially important, but it is not the same as being ready to release, dispatch, invoice, or close execution.

## Sprint 8X order document send history and preview routes

Sprint 8X adds the missing document-send foundation below the clean Sprint 8W Orders UI.

New behavior:

1. Adds additive child table `order_document_sends`.
2. Each **Send tracked** action now creates one send-history row instead of only overwriting the parent `order_documents` row.
3. Each send-history row stores:
   - `order_document_id`;
   - `order_id`;
   - document type;
   - channel;
   - recipient;
   - recipient role;
   - note;
   - send status;
   - unique share token;
   - preview/share URL;
   - sent timestamp;
   - opened timestamp;
   - open count;
   - created by;
   - metadata.
4. The parent `order_documents` row still stores latest status and latest send snapshot for fast status display.
5. The Orders document tray now reads send history and shows recent sends, preview links, recipients, and open counts.
6. A tracked preview route exists at `/order-documents/preview/[token]`.
7. Opening the preview route increments `open_count` on the specific send row and updates opened timestamps.
8. The preview route currently verifies tracked link, document lineage, order context, and open tracking. Final buyer-facing PDF/body rendering can plug into the same route later.
9. Quote history remains untouched.

Important limitation:

- Sprint 8X creates preview-link and open-tracking foundation. It does not yet render the final production PDF body for every order document type. It should not claim external email/WhatsApp delivery unless a future transport adapter confirms delivery.

Setu Guru should now distinguish between:

- parent document status in `order_documents`; and
- per-recipient/per-send history in `order_document_sends`.

If a user asks “did we send this again?” Guru should look for send-history rows, not only parent `sent_at`.

## Sprint 8W clean Orders UI pattern

Sprint 8W pivots the Orders UI back to the approved walkthrough pattern from the uploaded HTML preview: one queue, one open order, one compact stage strip, and one active stage panel.

New behavior:

1. The Orders page no longer renders separate stacked source, logistics, and trade-requirement panels below the workspace.
2. The left queue remains compact and answers: **which order needs attention next?**
3. The right workspace opens one selected order and answers: **what do I do now?**
4. The user-facing stage strip is simplified to seven business stages:
   - Quote Approved
   - Internal Approval
   - Packing / Freight
   - Processing
   - Logistics
   - Dispatch / Invoice
   - Paid & Closed
5. Backend records still keep the more detailed execution truth: `orders`, `order_lines`, `order_approval_gates`, `order_documents`, `packing_plans`, `freight_rate_requests`, `shipments`, `trade_requirements`, and `finance_sync_records`.
6. Completed stages remain clickable. Done means locked from unsafe edits, not hidden.
7. The stage panel now carries the relevant work for that stage instead of pushing more content below the page.
8. A compact document tray appears in document stages so users can preview documents at any time and resend approved/sent documents to different stakeholders.
9. Re-send is treated as normal workflow behavior: send to buyer, finance, warehouse, logistics provider, or another stakeholder without mutating quote history.
10. Quote history remains untouched.

Important design rule:

> Do not keep expanding the Orders page downward. Fold new capability into the selected stage panel, document tray, or a focused modal/drawer.

Setu Guru should explain Orders using the clean model: queue → selected order → stage strip → active stage panel → document tray / action bar. Guru should not describe logistics or trade requirements as separate products below the Orders workspace.

## Document preview and resend rule

Every created order document should be previewable after creation and sendable again after approval/send.

Target document behavior:

- Preview
- Download / PDF
- Send tracked
- Send again
- Copy link
- View history
- Create new version where revision is allowed

Sprint 8X makes repeat send history real with `order_document_sends`. A single document may now have many sends to many recipients.

## Sprint 8U industry-neutral trade requirement search and attach

Sprint 8U introduced order-stage trade requirements using `trade_requirements` and `trade_requirement_sources`. After Sprint 8W/8X, these should be presented inside the relevant active stage panel or drawer, not as a full-width permanent section below Orders.

Rules remain:

- Requirements attach to order/stage/order-line context.
- Requirements depend on order type, country pair, product/category, HS/HSN, shipment mode, Incoterm, buyer/bank terms, and human-confirmed source.
- Lead compliance remains active for lead/quote readiness.
- Order execution blockers use order-stage `trade_requirements`.
- Do not auto-waive, auto-approve, or advance order stages.

## Sprint 8T packing, freight, dispatch, and closeout UI

Sprint 8T introduced logistics readiness data from `packing_plans`, `freight_rate_requests`, `freight_rate_quotes`, `shipments`, `order_documents`, and `finance_sync_records`. After Sprint 8W/8X, that data should appear inside the relevant stage panel:

- Packing / Freight stage shows packing sheet, freight request, and selected quote.
- Processing stage shows pick/pack/QC and packing list readiness.
- Logistics stage shows shipment booking, delivery note, BOL/AWB, and shipping docs.
- Dispatch / Invoice stage shows dispatch invoice evidence and send status.
- Paid & Closed stage shows finance sync, payment, receipt, archive, and closeout.

Do not render a separate logistics dashboard below the active order workspace unless it is intentionally opened as a detail drawer.

## Sprint 8S order document gates and send tracking

Sprint 8S added the first structured order-document send gate on top of the stage shell. Sprint 8X extends that with child send history.

Behavior:

1. Order document state is persisted in `order_documents`.
2. Per-send state is persisted in `order_document_sends`.
3. Send activity is recorded in `order_stage_events`.
4. Stage panels can expose **Prepare → Preview → Approve → Send tracked**.
5. Supported first-document types include:
   - `order_confirmation` for regional orders;
   - `proforma_invoice` for export orders;
   - `dispatch_invoice` for later dispatch invoice work.
6. Sending records channel, recipient, note, source quote ID, and source quote version ID.
7. The current send action records structured send state but does not yet guarantee external delivery.
8. Quote history is not mutated.

## Sprint 8R structured Orders shell

Sprint 8R made the Orders workspace structured-order first. Sprint 8W/8X keep that but simplify the user-facing shell.

Protected behavior:

- Orders load from structured `orders` records first.
- Left queue opens one structured order at a time.
- Open order shows accepted quote-version lineage and source health.
- Actual order lines compare accepted quote-version lines to `order_lines`.
- Stage action panel shows the next safe gate action.
- Legacy quote/contract-only workflow is deprecated for new execution.
- Quote history is not mutated.

## Best for

- Turning accepted quotes into controlled execution work.
- Showing one clear next action instead of stacked dashboards.
- Previewing and resending order documents anytime.
- Tracking each document send to each recipient separately.
- Tracking document opens per send link.
- Tracking accepted quote-version lineage, actual order lines, documents, trade requirements, packing, freight, shipment, dispatch, finance sync, and closeout posture.
- Separating accepted quote status from fulfillment readiness.

## Common questions Setu Guru should answer

- What is blocking this order?
- Which stage is this order in?
- Which quote version created this order?
- Can I preview this document again?
- Can I send this document again to another user?
- Who did we send this document to?
- Was this tracked document link opened?
- Has this order confirmation or proforma been sent/tracked?
- Which trade requirements apply to this order stage?
- Is packing approved for this order?
- Has freight been selected for this order?
- Is shipment booked or dispatched?
- Is dispatch invoice evidence ready?
- Is finance closeout synced?
- Which evidence is missing before release?
- Is this a quote issue or an order execution issue?
- Why do I need to prepare actual order lines after quote approval?

## Common blockers

- Accepted quote has not been converted or linked correctly.
- Order source quote version does not match the quote `accepted_version_id`.
- Actual order lines have not been prepared from the approved quote yet.
- Actual order lines have not been internally approved yet.
- First document gate has not been prepared, previewed, approved, or sent/tracked.
- Document was sent but there is no child send-history row for the recipient.
- Tracked preview route exists but final buyer-facing PDF rendering is not plugged in yet.
- Order-stage trade requirement has not been attached or source-confirmed.
- Required or blocking trade requirement is still pending review.
- Packing sheet has not been prepared, previewed, or approved.
- Freight request or freight quote selection is missing.
- Shipment booking is missing.
- Dispatch invoice document evidence is missing.
- Finance sync or receipt closeout is missing.
- User wants to advance order state without required evidence or human approval.

## Data sources

- Structured `orders` records.
- `order_lines` actual buyer order lines.
- Accepted quote and accepted quote version.
- `quote_version_line_items` as the accepted commercial source snapshot.
- `order_documents` for parent document state.
- `order_document_sends` for per-recipient send/open history.
- `order_approval_gates` and `order_stage_events`.
- `trade_requirement_rules`, `trade_requirements`, and `trade_requirement_sources`.
- Packing plans and packing plan lines.
- Freight rate requests and freight rate quotes.
- Shipments.
- Finance sync records.
- Documents attached to order, lead, quote, or dispatch.

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
- attaching or confirming trade requirements without human action;
- waiving trade requirements;
- sending or approving a freight/delivery rate request;
- selecting a freight quote or booking a shipment;
- marking shipment dispatched or delivered;
- syncing finance or closing payment/receipt.

## Sprint 8X smoke-check checklist

Use this checklist before the next Orders pass:

- Does `order_document_sends` exist with RLS enabled?
- Does Send tracked create a child send-history row?
- Does each send row store recipient, channel, role, note, preview URL, sent time, and open tracking fields?
- Does the preview route `/order-documents/preview/[token]` resolve tracked sends?
- Does opening a preview link increment `open_count`?
- Does the document tray show recent send rows and preview links?
- Does the parent `order_documents` status still update to latest sent state?
- Does the UI avoid claiming external delivery unless transport confirms it?
- Does quote history remain untouched?
- Are quote/compliance/catalog/lead protected flows untouched?

## Sprint 8W smoke-check checklist

Use this checklist before the next Orders pass:

- Does `/orders` render one clean workspace rather than stacked 8T/8U panels?
- Does the left queue stay compact?
- Does exactly one selected order open on the right?
- Does the user-facing stage strip show seven business stages?
- Are completed stages clickable?
- Can a user return to a cleared stage to preview/send again?
- Is there a document tray in document-related stages?
- Does Send tracked remain available for approved/sent documents?
- Does the UI avoid claiming external delivery unless confirmed?
- Does quote history remain untouched?
- Are quote/compliance/catalog/lead protected flows untouched?

## Suggested prompts

- What is blocking this order?
- Can I preview the Proforma again?
- Send this packing sheet again to another forwarder.
- Who opened the order confirmation link?
- Which document sends are still unopened?
- Which quote version created this order?
- Which trade requirements apply to this order?
- Is packing approved for this order?
- Has freight been selected for this order?
- Is shipment booked or dispatched?
- Is dispatch invoice evidence ready?
- Is finance closeout synced?
- Explain the approval boundary for this order.
