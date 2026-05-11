# Orders help

Route: `/orders`
Owner: Setu Guru knowledge base
Last updated: 2026-05-11

## Purpose

Use Orders after quote acceptance to manage execution readiness, release evidence, dispatch documents, and shipment progress. Orders should make it clear that an accepted quote is commercially important, but it is not the same as being ready to release, dispatch, or close execution.

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

## Sprint 8G Order Confirmation PDF and Invoice generation

Sprint 8G wires the Orders drawer CTAs to live order-native PDF routes.

Live document generation routes:

1. **Generate order PDF** opens `/api/orders/[contractId]/order-confirmation/pdf`.
2. **Generate invoice** opens `/api/orders/[contractId]/invoice/pdf`.
3. Both PDFs are generated from the linked contract, accepted quote, lead/customer record, and contract line items.
4. Generated PDFs are also registered as contract documents so they appear in order evidence history.
5. The quote PDF remains in Quotes and is not replaced by the order/invoice documents.

Setu Guru should explain that Order Confirmation PDF and Invoice generation are now live for orders with linked contracts. If an order has no linked contract, the user must complete the quote-to-contract/order handoff first. Setu Guru must still explain that release, dispatch, waiver, payment clearance, document deletion, and closeout remain human-approved operations.

## Sprint 8F Orders shell de-duplication and row-click open

Sprint 8F removes the duplicated inner Orders Desk shell treatment and adds order row/header click behavior without breaking existing CTAs.

Production UI principles for Sprint 8F:

1. Use only the global Orders / Execution header and global All / Buyers / Suppliers mode switch.
2. Hide the duplicate inner Orders Desk strip and inner mode/export controls.
3. Keep each order card as the summary owner for company, amount, timeline, and readiness status.
4. Clicking the order row/header should open the order through the existing `openOrderId` route.
5. Buttons and CTAs must remain interactive and must not be swallowed by row-click behavior.
6. Existing actions still own their original routes or server actions: View quote, Close/Open order, Lead record, Confirm order, Generate order PDF, Generate invoice, Attach evidence.

Setu Guru should describe Orders as a list/detail workspace: the row opens context, the drawer acts, and explicit buttons keep their original purpose.

## Sprint 8E de-duplication and compact row-click workspace

Sprint 8E addresses the production screenshot feedback that Orders still repeated the workflow and execution state inside the open order. The open order drawer should not repeat timeline/readiness rows already visible on the card.

Production UI principles for Sprint 8E:

1. The main order card owns the visible workflow/timeline and readiness summary.
2. The expanded order detail owns actions, document readiness, upload, and collapsible evidence only.
3. Do not repeat execution state, commercial lock, documents, and payment rows inside the detail if the card already shows them.
4. Keep the detail short enough that multiple orders remain scannable.
5. The next page-shell pass should remove the duplicate inner All/Buyers/Suppliers control and make the order card/header itself open the order, not only the Open order button.

Setu Guru should explain this distinction when asked about Orders UX: the card summarizes, the drawer acts.

## Sprint 8D compact command-center cleanup

Sprint 8D removes help-style explanation from the production Orders screen and keeps the order UI action-first. Setu Guru should carry the explanatory load instead of the page.

Production UI principles:

1. Keep the open order detail compact.
2. Avoid instructional banners such as “native workspace,” “execution control lane,” or “not an embedded frame.”
3. Keep the primary action row visible: confirm/progress order, generate order PDF, generate invoice, attach evidence.
4. Keep the document readiness grid short: Quote PDF, Order confirmation, Invoice.
5. Upload remains for final evidence, not a substitute for generated order/invoice documents.
6. Documents and evidence should be collapsible unless blockers are present.

Setu Guru should explain the workflow when asked, but the production UI should stay concise.

## Sprint 8C native page shell and generation route plan

Sprint 8C continues the production screenshot cleanup by making the open order detail feel more like a native SETU Flow execution workspace and less like an embedded document frame. The order detail now names itself as a native order workspace, highlights the execution control lane, and marks Order Confirmation PDF and Invoice generation as planned first-class order actions.

Planned generation route sequence:

1. **Quote PDF** remains in Quotes as the commercial source.
2. **Generate Order Confirmation PDF** should create an order document from the signed contract, locked commercial snapshot, accepted quote version, and contract line items.
3. **Generate Invoice** should create an invoice after release/dispatch posture is clear so billing matches execution state.
4. **Attach final evidence** remains available for signed PDFs, invoices, packing lists, bills of lading, certificates, lab reports, and final dispatch evidence.

Setu Guru should explain that the current Sprint 8D UI shows the generation actions as coming-next routes but does not yet generate the PDFs. The next implementation pass should wire the Order Confirmation PDF and Invoice generation routes/actions.

## Sprint 8B production screenshot cleanup

Sprint 8B is based on the production Orders screenshot showing the workspace feeling embedded/iframe-like and not helping operators create or sequence order documents after contract signing.

Setu Guru should explain Orders as an execution command center with this document chain:

1. **Quote PDF** — the commercial source document remains in Quotes.
2. **Order confirmation** — the signed contract and locked line items become the order execution source.
3. **Invoice** — invoice evidence should follow release/dispatch posture so billing matches execution state.
4. **Dispatch evidence** — packing list, bill of lading, certificate of origin, quality/lab evidence, and related files support release and shipment.

When a user says “upload is not working,” Setu Guru should first check that the order has a linked contract, the user selected a real file, the document type is correct, and the file is being attached as final order evidence rather than as a quote blocker.

## Sprint 8A execution readiness map

Sprint 8A starts Orders and execution readiness with a production smoke-check map. Until a production screenshot shows a specific defect, Orders work should focus on clarity, routing, and Setu Guru guidance rather than rewriting quote, compliance, catalog, or lead workflows.

When Setu Guru answers an Orders question, it should classify the blocker into one of these lanes:

1. **Commercial lock** — accepted quote, buyer/supplier confirmation, final terms, and quote/order linkage.
2. **Payment / release readiness** — payment posture, release hold, internal approval, or readiness to start fulfillment.
3. **Document evidence** — order, quote, lead, dispatch, or shipment documents that are missing, expired, pending review, or advisory.
4. **Compliance posture** — open compliance items, required evidence, human waiver needs, or advisory dispatch documents that should not be mistaken for quote-send blockers.
5. **Dispatch readiness** — packing, shipment, release, dispatch document, and execution handoff readiness.

Setu Guru should explain which lane is blocking the order before suggesting the next route.

## Best for

- Turning accepted quotes into controlled execution work.
- Tracking payment/commercial lock, document readiness, release readiness, and dispatch posture.
- Separating accepted quote status from fulfillment readiness.
- Managing order documents without changing accepted quote terms.
- Giving operators a clear next action after quote acceptance.

## Common questions Setu Guru should answer

- What is blocking this order?
- Is this order commercially accepted but not execution-ready?
- What evidence is missing before dispatch?
- Which documents are advisory, required, expired, or pending review?
- Is this a commercial, payment, document, compliance, or dispatch blocker?
- What is the next safe execution action?
- Where do I get the quote PDF, order confirmation, and invoice?
- Why is order upload not accepting my file?
- Why do I need to prepare actual order lines after quote approval?
- Can buyer order quantities differ from the quote?
- What does internal order approval mean?
- What is the difference between Order Confirmation and Proforma Invoice?

## Common blockers

- Accepted quote has not been converted or linked correctly.
- Commercial lock, payment status, or release readiness is incomplete.
- Actual order lines have not been prepared from the approved quote yet.
- Actual order lines have not been internally approved yet.
- First document gate has not been prepared, previewed, or approved.
- Dispatch evidence is missing or pending review.
- Compliance/document status is open, expired, or advisory but unresolved.
- Dispatch documents are being treated as quote-send blockers instead of order execution readiness items.
- Order confirmation and invoice workflow is unclear after contract signing.
- User wants to advance order state without required evidence or human approval.

## Data sources

- Orders and execution states.
- Accepted quote and quote lines.
- New execution `orders` and `order_lines` records where present.
- Order approval gates and order stage events.
- Documents attached to order, lead, quote, or dispatch.
- Compliance checklist items and document requirement rules.
- Buyer/supplier and shipment notes.
- Payment, release, fulfillment, and dispatch status fields where available.

## Allowed actions

- Explain execution readiness and next action.
- Route to order document upload, Compliance Assist, or the linked lead/quote.
- Route to generated Order Confirmation PDF and Invoice when a contract is linked.
- Explain that actual order lines are prepared from the approved quote without mutating quote history.
- Explain internal approval and first document gate steps.
- Separate commercial, payment, document, compliance, and dispatch blockers.
- Draft an evidence checklist for human review.
- Explain the approval boundary before a user advances order execution.
- Explain the quote PDF → actual lines → internal approval → order confirmation/proforma → invoice sequence.

## Setu Guru order action buttons

Order actions are guidance and routing only unless a future approved pass adds an explicit approval-safe write path. Current safe behaviors:

- **Open Orders** routes to the Orders workspace.
- **Check order blockers** asks Setu Guru to inspect commercial, payment/release, document, compliance, and dispatch blockers without advancing order state.
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
- marking internal review or first document gates complete without user action.

## Response policy

Use live order context first when available. If only dashboard context is available, explain the likely blocker category and route the user to the exact order or execution queue. Success/failure messages should say whether Setu Guru queued guidance, routed the user, or could not complete the action.

When no live order context is visible, Setu Guru should ask the user to open the order or provide the order reference before giving record-specific status. It may still explain the five readiness lanes and the safest next route.

## Sprint 8L smoke-check checklist

Use this checklist before the next Orders pass:

- Does the Orders detail show the Sprint 8L gates?
- Does **Approve actual lines** require an existing execution order from Sprint 8K?
- Does Regional Order Confirmation support Prepare, Previewed, and Approve?
- Does Export Proforma Invoice support Prepare, Previewed, and Approve?
- Are gate records saved in `order_approval_gates`?
- Are `order_stage_events` created for gate changes?
- Does quote history remain untouched?
- Does the legacy order PDF/invoice flow still work?
- Are quote/compliance/catalog/lead protected flows untouched?

## Sprint 8K smoke-check checklist

Use this checklist before the next Orders pass:

- Does the Orders detail show **Prepare actual lines**?
- Does the action create exactly one `orders` record per source quote?
- Does it create `order_lines` from linked contract lines when available?
- Does it fall back to accepted quote version lines when no contract lines exist?
- Does it preserve source quote/contract references?
- Does it create the `actual_lines` approval gate and stage event?
- Does quote history remain untouched?
- Does the legacy order PDF/invoice flow still work?
- Are quote/compliance/catalog/lead protected flows untouched?

## Sprint 8G smoke-check checklist

Use this checklist before the next Orders pass:

- Does Generate order PDF open a PDF for orders with linked contracts?
- Does Generate invoice open a PDF for orders with linked contracts?
- Are generated order/invoice documents registered as contract documents?
- Does quote PDF remain separate in Quotes?
- Are release, dispatch, waiver, payment clearance, deletion, and closeout still human-approved?
- Are quote/compliance/catalog/lead protected flows untouched?

## Suggested prompts

- What is blocking this order?
- Is this order ready for dispatch?
- Which evidence is missing before release?
- Is this a quote issue or an order execution issue?
- Where do I create the order confirmation and invoice?
- Why is my order upload not working?
- Draft a dispatch evidence checklist.
- Explain the approval boundary for this order.
- Explain actual order lines after quote approval.
- Explain the first document gate for this order.
