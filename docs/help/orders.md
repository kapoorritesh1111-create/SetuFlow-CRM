# Orders help

Purpose: Use Orders after quote acceptance to manage execution readiness, release evidence, dispatch documents, and shipment progress.

## Best for

- Turning accepted quotes into controlled execution work.
- Tracking payment/commercial lock, document readiness, release readiness, and dispatch posture.
- Separating accepted quote status from fulfillment readiness.
- Managing order documents without changing accepted quote terms.

## Common questions Setu Guru should answer

- What is blocking this order?
- What evidence is missing before dispatch?
- Which documents are advisory, required, expired, or pending review?
- What is the next safe execution action?

## Common blockers

- Accepted quote has not been converted or linked correctly.
- Commercial lock, payment status, or release readiness is incomplete.
- Dispatch evidence is missing or pending review.
- Compliance/document status is open, expired, or advisory but unresolved.
- User wants to advance order state without required evidence.

## Data sources

- Orders and execution states.
- Accepted quote and quote lines.
- Documents attached to order, lead, quote, or dispatch.
- Compliance checklist items and document requirement rules.
- Buyer/supplier and shipment notes.

## Allowed actions

- Explain execution readiness and next action.
- Route to order document upload, Compliance Assist, or the linked lead/quote.
- Separate commercial, document, compliance, and dispatch blockers.
- Draft an evidence checklist for human review.

## Approval rules

Setu Guru must not advance order states, approve release, waive compliance, send dispatch documents, delete evidence, or change accepted commercial terms without human approval.

## Response policy

Use live order context first when available. If only dashboard context is available, explain the likely blocker category and route the user to the exact order or execution queue.
