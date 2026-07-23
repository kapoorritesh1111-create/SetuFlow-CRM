# Orders trade requirements help

Route: `/orders`
Owner: Setu Guru knowledge base
Last updated: 2026-05-11

## Purpose

The industry-neutral trade requirement search and attach foundation for Orders. This is not food-only compliance and not a hard-coded document checklist. It is a generic requirement layer for import, export, regional distribution, and delivery execution.

## What this adds

1. Trade requirement actions can attach requirements to a specific execution order.
2. Requirements are based on existing `trade_requirement_rules` when matching rules exist.
3. If no rule matches, the action can attach a human-review search snapshot so the operator can confirm requirements manually.
4. Requirement context can include order type, origin/destination, Incoterm, destination port/place, HS/HSN codes, product/category, and source details.
5. Requirement sources are stored in `trade_requirement_sources` with source name, URL/title when supplied, checked date, query context, snapshot, confidence, and human confirmation fields.
6. Attached requirements stay in `pending_review` until a human confirms them.
7. Human source confirmation updates the requirement and source records but does not waive, clear, send, dispatch, or close anything.
8. Gate status is recorded in `order_approval_gates` as `trade_requirement_search` prepared.
9. Stage history is recorded in `order_stage_events`.
10. Quote history remains untouched.

## Industry-neutral requirement types

Setu Guru should use generic labels and avoid food-only assumptions:

- commercial document
- customs document
- transport document
- origin document
- quality document
- safety document
- regulatory document
- finance document
- buyer-requested document
- internal approval

Examples can include COO, BOL/AWB, insurance, inspection, lab report, test certificate, MSDS/SDS, warranty document, tax document, delivery note, proof of delivery, or buyer/bank requested documents, but Guru must explain they apply only when the order context requires them.

## Severity model

Setu Guru must distinguish:

- advisory
- required before send
- required before booking
- required before dispatch
- required before docs release
- blocking

Guru should never turn an advisory requirement into a blocker unless the stored requirement severity says so or a human reviewer confirms it.

## Regional vs export behavior

For regional or distribution orders:

- Do not force export customs documents.
- Focus on delivery note, proof of delivery, local transport/tax evidence, buyer-requested documents, and internal approval.
- Packing and freight/delivery rate requests can still apply.

For export or import orders:

- Requirements may include customs, origin, transport, insurance, inspection, finance/bank, buyer-requested, or safety/regulatory documents.
- Guru should recommend official-source lookup and human confirmation before treating a requirement as final.

## Setu Guru response policy

When asked “what documents are needed for this order,” Guru should:

1. Use live order context first when available.
2. Identify whether the order is regional/distribution or export/import.
3. Explain which context is known and which is missing: country, product/category, HS/HSN, shipment mode, Incoterm, buyer/bank requirement.
4. Separate attached requirements from suggested requirements.
5. Mention whether each item is advisory, required, or blocking.
6. Ask for human confirmation before marking a source confirmed.
7. Avoid approving, waiving, sending, deleting, dispatching, booking freight, or closing orders.

## Allowed actions

Guru may:

- Explain order-specific requirement categories.
- Draft a search query for official-source/manual research.
- Explain how to attach a source snapshot.
- Explain why a requirement is advisory, required, or blocking.
- Explain which stage the requirement belongs to.
- Route users back to the Orders workspace.

Guru must not:

- Confirm a requirement source without explicit human action.
- Clear or waive a trade requirement.
- Mark export compliance complete.
- Send documents.
- Book freight or dispatch.
- Sync finance records.
- Change quote history.
- Treat food/agri documents as universal requirements.

## Smoke-check checklist

- Does trade requirement search use `trade_requirement_rules` when rules match?
- Does it fall back to human-review search snapshots when no rule matches?
- Are requirements attached to `trade_requirements` with `pending_review` status?
- Are source snapshots stored in `trade_requirement_sources`?
- Are order stage events recorded?
- Does the gate use `trade_requirement_search` prepared state?
- Does source confirmation require explicit human action?
- Are regional/distribution orders not forced through export documents?
- Is quote history untouched?
- Are quote/compliance/catalog/lead protected flows untouched?

## Suggested prompts

- What trade requirements may apply to this order?
- Is this requirement advisory or blocking?
- What official source should I check for this destination and product?
- Attach this requirement source for human review.
- Confirm this requirement source after my review.
- Explain the difference between quote compliance and order trade requirements.
