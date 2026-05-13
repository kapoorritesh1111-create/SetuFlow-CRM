# Orders help

Route: `/orders`
Owner: Setu Guru knowledge base
Last updated: 2026-05-12

## Purpose

Use Orders after quote acceptance to manage execution readiness, documents, trade requirements, packing, freight, shipment, dispatch invoice, payment, and closeout. Orders should make it clear that an accepted quote is commercially important, but it is not the same as being ready to release, dispatch, invoice, or close execution.

## Sprint 8Z print PDF action and Admin T&C placeholder

Sprint 8Z adds the first user-facing PDF path and an Admin visibility surface for future document terms management.

New behavior:

1. The tracked document preview route now shows a **Download / Print PDF** action.
2. The action uses browser print from the approved v3 preview route as the source.
3. Print CSS hides the action toolbar from the PDF output.
4. The route still renders v3-style regional/export document bodies from structured order data and terms profiles.
5. The route still increments tracked open counts when opened.
6. Admin navigation now includes **Documents → Templates & terms**.
7. A placeholder page exists at `/admin/document-templates`.
8. The placeholder page shows current regional/export default terms profiles for the active organization.
9. The placeholder page intentionally does not edit terms yet.
10. The future full editor remains deferred until versioning, legal/tax review status, approvals, and audit history are designed.

Important limitation:

- Sprint 8Z does not add a server-side PDF binary generator yet. Users can choose **Download / Print PDF** and use the browser print dialog to save the preview as PDF.
- The Admin page is a safe visibility/readiness page. It is not the final T&C editor.

Future Admin T&C editor requirements remain:

- regional/export template family;
- document type;
- organization country default;
- tax profile;
- page-1 compact terms;
- annexure terms;
- export declarations;
- bank details;
- GST/VAT/TRN/GSTIN/IEC/PAN/AD Code/LUT ARN fields;
- stamp/signature settings;
- country-pair/product/category/HSN/HS/Incoterm-specific clauses;
- buyer/bank/compliance-specific clauses;
- version history;
- legal/tax review status;
- approval workflow;
- preview before publish.

## Sprint 8Y v3 document body renderer and default terms profiles

Sprint 8Y implements the approved v3 document direction from the reviewed sample pack. The preview route now renders real document bodies instead of only showing tracking metadata.

Approved sample reference:

- `SETU_Order_Document_Sample_Pack_v3.pdf`
- Regional documents: Order Confirmation, Packing/Picklist/QC, Delivery Note, Regional Tax/Dispatch Invoice.
- Export documents: Proforma Invoice, Export Packing List, Freight Rate Request / Shipment Instruction, Export Commercial/Dispatch Invoice.

New behavior:

1. Adds `organization_document_terms_profiles` as the default terms/declarations/tax-profile source for order documents.
2. Existing organizations receive default regional/export terms profiles.
3. New organizations automatically receive default document terms profiles using organization country defaults where available.
4. The tracked preview route `/order-documents/preview/[token]` renders a v3-style document body using:
   - structured `orders`;
   - `order_lines`;
   - `order_documents`;
   - `order_document_sends`;
   - buyer/lead context;
   - organization identity placeholders;
   - `organization_document_terms_profiles`.
5. Regional/export templates are separated.
6. Documents include line-level tax/customs placeholders:
   - regional: GST/VAT/sales-tax style fields, HSN/category basis, CGST/SGST/IGST placeholders;
   - export: HS/ITC-HS, country of origin, declared value, LUT/IGST declaration, importer duties/taxes, currency/FX placeholders.
7. Documents include stamp/signature zones by document type.
8. Page 1 uses compact operational terms so long item tables have room.
9. Annexure terms render after page 1 and are designed for future Admin configuration.
10. Opening the tracked preview still increments send open tracking.
11. Quote history remains untouched.

The terms are default operational templates and not final legal/tax advice. They must become Admin-managed by organization.

Setu Guru must explain that every sendable document should include default industry-standard terms based on organization country and document type when an org is created. Guru must also make clear that Admin-managed templates will override defaults later.

## Sprint 8X order document send history and preview routes

Sprint 8X adds the missing document-send foundation below the clean Sprint 8W Orders UI.

Behavior:

1. Adds additive child table `order_document_sends`.
2. Each **Send tracked** action now creates one send-history row instead of only overwriting the parent `order_documents` row.
3. Each send-history row stores recipient, channel, role, note, send status, unique share token, preview URL, sent timestamp, opened timestamp, open count, created by, and metadata.
4. The parent `order_documents` row still stores latest status and latest send snapshot for fast status display.
5. The Orders document tray reads send history and shows recent sends, preview links, recipients, and open counts.
6. Opening the preview route increments `open_count` on the specific send row and updates opened timestamps.
7. Quote history remains untouched.

Setu Guru should distinguish between:

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
7. The stage panel carries the relevant work for that stage instead of pushing more content below the page.
8. A compact document tray appears in document stages so users can preview documents at any time and resend approved/sent documents to different stakeholders.
9. Re-send is treated as normal workflow behavior and does not mutate quote history.

Important design rule:

> Do not keep expanding the Orders page downward. Fold new capability into the selected stage panel, document tray, or a focused modal/drawer.

## Document preview and resend rule

Every created order document should be previewable after creation and sendable again after approval/send.

Target document behavior:

- Preview
- Browser print / PDF path
- Send tracked
- Send again
- Copy link
- View history
- Create new version where revision is allowed

A single document may have many sends to many recipients through `order_document_sends`.

## Sprint 8U industry-neutral trade requirement search and attach

Sprint 8U introduced order-stage trade requirements using `trade_requirements` and `trade_requirement_sources`. After Sprint 8W/8X/8Y/8Z, these should be presented inside the relevant active stage panel or drawer, not as a full-width permanent section below Orders.

Rules remain:

- Requirements attach to order/stage/order-line context.
- Requirements depend on order type, country pair, product/category, HS/HSN, shipment mode, Incoterm, buyer/bank terms, and human-confirmed source.
- Lead compliance remains active for lead/quote readiness.
- Order execution blockers use order-stage `trade_requirements`.
- Do not auto-waive, auto-approve, or advance order stages.

## Sprint 8T packing, freight, dispatch, and closeout UI

Sprint 8T introduced logistics readiness data from `packing_plans`, `freight_rate_requests`, `freight_rate_quotes`, `shipments`, `order_documents`, and `finance_sync_records`. After Sprint 8W/8X/8Y/8Z, that data should appear inside the relevant stage panel:

- Packing / Freight stage shows packing sheet, freight request, and selected quote.
- Processing stage shows pick/pack/QC and packing list readiness.
- Logistics stage shows shipment booking, delivery note, BOL/AWB, and shipping docs.
- Dispatch / Invoice stage shows dispatch invoice evidence and send status.
- Paid & Closed stage shows finance sync, payment, receipt, archive, and closeout.

## Sprint 8S order document gates and send tracking

Sprint 8S added the first structured order-document send gate on top of the stage shell. Sprint 8X extends that with child send history, Sprint 8Y adds v3 document bodies, and Sprint 8Z adds the print/PDF path.

Behavior:

1. Order document state is persisted in `order_documents`.
2. Per-send state is persisted in `order_document_sends`.
3. Send activity is recorded in `order_stage_events`.
4. Stage panels can expose **Prepare → Preview → Approve → Send tracked**.
5. Supported first-document types include:
   - `order_confirmation` for regional orders;
   - `proforma_invoice` for export orders;
   - `dispatch_invoice` for invoice/commercial invoice work.
6. Sending records channel, recipient, note, source quote ID, and source quote version ID.
7. The current send action records structured send state but does not yet guarantee external email/WhatsApp delivery.
8. Quote history is not mutated.

## Sprint 8R structured Orders shell

Sprint 8R made the Orders workspace structured-order first. Sprint 8W/8X/8Y/8Z keep that but simplify the user-facing shell.

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
- Rendering regional/export documents with industry-ready tax/customs/stamp sections.
- Downloading/printing tracked previews as PDFs through browser print.
- Tracking each document send to each recipient separately.
- Tracking document opens per send link.
- Tracking accepted quote-version lineage, actual order lines, documents, trade requirements, packing, freight, shipment, dispatch, finance sync, and closeout posture.
- Separating accepted quote status from fulfillment readiness.

## Common questions Setu Guru should answer

- What is blocking this order?
- Which stage is this order in?
- Which quote version created this order?
- Can I preview this document again?
- Can I print or download this document as PDF?
- Can I send this document again to another user?
- Who did we send this document to?
- Was this tracked document link opened?
- Which terms profile is used for this document?
- Is this using regional or export document terms?
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
- Organization terms profile is missing or not configured for document type/country.
- Organization identity, tax IDs, bank details, stamp, or signature settings are not configured.
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
- `organization_document_terms_profiles` for default and future Admin-managed terms/declarations/tax/stamp settings.
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

## Sprint 8Z smoke-check checklist

Use this checklist before the next Orders pass:

- Does tracked preview show Download / Print PDF action?
- Does browser print hide the toolbar?
- Does print preserve the v3 document body and annexure?
- Does `/admin/document-templates` load for admins?
- Does Admin navigation show Documents → Templates & terms?
- Does the placeholder page show regional/export terms profile coverage?
- Does the placeholder page clearly defer editing until versioning/legal/audit workflow is designed?
- Does quote history remain untouched?
- Are quote/compliance/catalog/lead protected flows untouched?

## Sprint 8Y smoke-check checklist

Use this checklist before the next Orders pass:

- Does `organization_document_terms_profiles` exist with RLS enabled?
- Do existing organizations have default regional/export terms profiles?
- Does new organization creation seed default document terms profiles?
- Does `/order-documents/preview/[token]` render v3-style document body, not just metadata?
- Does regional vs export document rendering differ visibly?
- Do regional documents show tax placeholders such as GST/VAT/CGST/SGST/IGST/HSN/category?
- Do export documents show HS/ITC-HS, country of origin, declared value, LUT/IGST/import duty placeholders?
- Do documents show stamp/signature zones?
- Do documents show compact page-1 terms and annexure terms?
- Does preview still increment open tracking?
- Does quote history remain untouched?
- Are quote/compliance/catalog/lead protected flows untouched?

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

## Suggested prompts

- What is blocking this order?
- Can I preview the Proforma again?
- Print this document as PDF.
- Send this packing sheet again to another forwarder.
- Who opened the order confirmation link?
- Which document sends are still unopened?
- Which quote version created this order?
- Which terms profile is used for this document?
- Is this regional or export document rendering?
- Which trade requirements apply to this order?
- Is packing approved for this order?
- Has freight been selected for this order?
- Is shipment booked or dispatched?
- Is dispatch invoice evidence ready?
- Is finance closeout synced?
- Explain the approval boundary for this order.
