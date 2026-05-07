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

## Setu Guru order action buttons

Order actions are guidance and routing only unless a future approved pass adds an explicit approval-safe write path. Current safe behaviors:

- **Open Orders** routes to the Orders workspace.
- **Check order blockers** asks Setu Guru to inspect commercial, document, compliance, and dispatch blockers without advancing order state.
- **Draft dispatch evidence checklist** queues a checklist prompt in the composer.
- **Review order approval boundary** explains which order actions require human approval.

## Approval rules

Setu Guru must not advance order states, approve release, waive compliance, send dispatch documents, delete evidence, or change accepted commercial terms without human approval.

## Response policy

Use live order context first when available. If only dashboard context is available, explain the likely blocker category and route the user to the exact order or execution queue. Success/failure messages should say whether Setu Guru queued guidance, routed the user, or could not complete the action.
