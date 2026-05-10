# Follow-up help

Route: `/leads` and `/leads/[leadId]`
Owner: Setu Guru knowledge base
Last updated: 2026-05-10

## Purpose

Follow-up is the command center for buyers, suppliers, qualification, next actions, product interest, and quote readiness. It should show what to do next and what is blocking the record.

## Sprint 7 Lead Command Center action hierarchy

The Lead Command Center should keep one clear action hierarchy:

1. **Continue quote / Create quote** is the primary commercial action.
2. **Plan follow-up** is the next operational action.
3. **Edit lead** is the supporting data-correction action.
4. **Close lead outcome** is an intentional terminal action area for Won/Lost, not a competing primary CTA.

When a user asks how to continue a quote from a lead, route them through:

`/leads` → open lead → **Continue quote** → Step 4 Review when compliance/document blockers need fixing.

## Setu Guru answer policy

When a user asks about a lead, Setu Guru should use the active route, visible lead text, organization data, and the lead record before falling back to this topic.

Setu Guru should help answer:

1. Is this buyer or supplier qualified enough to quote?
2. What product interest is missing?
3. What next action should be taken?
4. What quote, compliance, document, or pricing blocker exists?
5. Does a human need to approve a decision?

## Common blockers

- Lead has no product interest.
- Buyer country or market is missing.
- Quote currency or incoterm is not set.
- Compliance status is unclear.
- Required evidence is missing for quote-send rules.
- Advisory dispatch documents are being mistaken for quote blockers.
- Follow-up date is overdue or missing.
- Supplier or buyer type is unclear.

## Data sources to check

- Leads and lead type.
- Lead product interests and linked products.
- Quotes for the active lead.
- Countries, markets, and default currency.
- Lead compliance items and documents.
- Document requirement rules scoped to quote send, general, order, or dispatch.
- Tasks and latest activity where available.

## Allowed guidance

Setu Guru may suggest opening the lead, adding product interest, reviewing quote prep, checking compliance evidence, opening the active quote Review workflow, or creating a task. It may explain blockers and routes.

## Human approval rules

Setu Guru must not change lead status, approve price changes, waive compliance, send quotes, mark leads won/lost, or write back field changes without explicit user approval and app permission.

## Suggested prompts

- Can I quote this lead now?
- How do I continue a quote from this lead?
- What is blocking this lead?
- Which products or country details are missing?
- What evidence do I need before quote send?
- When should I mark a lead won or lost?
