# Orders help

Route: `/orders`
Owner: Setu Guru knowledge base
Last updated: 2026-05-11

## Purpose

Use Orders after quote acceptance to manage execution readiness, release evidence, dispatch documents, and shipment progress. Orders should make it clear that an accepted quote is commercially important, but it is not the same as being ready to release, dispatch, or close execution.

## Sprint 8C native page shell and generation route plan

Sprint 8C continues the production screenshot cleanup by making the open order detail feel more like a native SETU Flow execution workspace and less like an embedded document frame. The order detail now names itself as a native order workspace, highlights the execution control lane, and marks Order Confirmation PDF and Invoice generation as planned first-class order actions.

Planned generation route sequence:

1. **Quote PDF** remains in Quotes as the commercial source.
2. **Generate Order Confirmation PDF** should create an order document from the signed contract, locked commercial snapshot, accepted quote version, and contract line items.
3. **Generate Invoice** should create an invoice after release/dispatch posture is clear so billing matches execution state.
4. **Attach final evidence** remains available for signed PDFs, invoices, packing lists, bills of lading, certificates, lab reports, and final dispatch evidence.

Setu Guru should explain that the current Sprint 8C UI shows the planned generation actions but does not yet generate the PDFs. The next implementation pass should wire the Order Confirmation PDF and Invoice generation routes/actions.

## Sprint 8B production screenshot cleanup

Sprint 8B is based on the production Orders screenshot showing the workspace feeling embedded/iframe-like and not helping operators create or sequence order documents after contract signing.

Setu Guru should now explain Orders as an execution command center with this document chain:

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

## Common blockers

- Accepted quote has not been converted or linked correctly.
- Commercial lock, payment status, or release readiness is incomplete.
- Dispatch evidence is missing or pending review.
- Compliance/document status is open, expired, or advisory but unresolved.
- Dispatch documents are being treated as quote-send blockers instead of order execution readiness items.
- Order confirmation and invoice workflow is unclear after contract signing.
- User wants to advance order state without required evidence or human approval.

## Data sources

- Orders and execution states.
- Accepted quote and quote lines.
- Documents attached to order, lead, quote, or dispatch.
- Compliance checklist items and document requirement rules.
- Buyer/supplier and shipment notes.
- Payment, release, fulfillment, and dispatch status fields where available.

## Allowed actions

- Explain execution readiness and next action.
- Route to order document upload, Compliance Assist, or the linked lead/quote.
- Separate commercial, payment, document, compliance, and dispatch blockers.
- Draft an evidence checklist for human review.
- Explain the approval boundary before a user advances order execution.
- Explain the quote PDF → order confirmation → invoice document sequence.
- Explain that generation buttons marked planned are not yet final PDF write actions.

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
- accepted quote term changes.

## Response policy

Use live order context first when available. If only dashboard context is available, explain the likely blocker category and route the user to the exact order or execution queue. Success/failure messages should say whether Setu Guru queued guidance, routed the user, or could not complete the action.

When no live order context is visible, Setu Guru should ask the user to open the order or provide the order reference before giving record-specific status. It may still explain the five readiness lanes and the safest next route.

## Sprint 8C smoke-check checklist

Use this checklist before the next Orders generation pass:

- Does the open order detail feel like a native SETU Flow execution workspace?
- Are generated Order Confirmation PDF and Invoice actions visible as planned routes without pretending they already generate final documents?
- Does the document kit still point users to Quotes for the quote PDF source?
- Does upload remain for final evidence rather than replacing the planned generation route?
- Are human approval actions clearly marked before release, dispatch, waiver, deletion, or closeout?
- Does Setu Guru answer from the current order context before giving generic order guidance?

## Suggested prompts

- What is blocking this order?
- Is this order ready for dispatch?
- Which evidence is missing before release?
- Is this a quote issue or an order execution issue?
- Where do I create the order confirmation and invoice?
- Why is my order upload not working?
- Draft a dispatch evidence checklist.
- Explain the approval boundary for this order.
