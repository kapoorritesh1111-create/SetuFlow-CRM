# Buyer-Specific Pricing and Approval Workflow

Sprint 34 issue: `S34-CATALOG-035`

## Purpose

This document records the approval-first buyer-specific pricing plan for Catalog Space.

Buyer-specific pricing must not silently override normal price lists. The first implementation is a planning and governance layer only. Normal price lists, catalog share pricing, quote conversion, and buyer-facing catalog links continue to work as they do today.

## Current implementation boundary

Implemented now:

- `buyer_pricing_plans`
- `buyer_pricing_plan_items`
- internal API: `/api/buyer-pricing-plans`
- guardrail evaluation for requested price vs base price
- approval status values: `draft`, `pending_approval`, `approved`, `rejected`, `archived`

Not implemented yet:

- buyer-facing application of buyer-specific prices
- automatic quote-line override from buyer pricing plan
- approval inbox UI
- sending blocked by buyer pricing approval status

## Workflow

1. Sales starts from a normal price list.
2. Sales creates a buyer-specific pricing plan for a lead/share.
3. Each item stores:
   - base unit price
   - requested buyer unit price
   - discount percentage
   - guardrail status
   - override reason
4. The system marks approval required when guardrails are triggered.
5. Approval-required plans stay internal until reviewed.
6. Approved plans can later be wired into catalog-share send and quote creation flows.

## Guardrails

Initial deterministic guardrails:

| Discount from base | Status | Behavior |
|---:|---|---|
| under 10% | `ok` | can remain draft without approval |
| 10% to under 20% | `warning` | requires approval before buyer visibility |
| 20% or more | `blocked` | requires approval before buyer visibility |

These are intentionally conservative placeholders until final margin rules are approved.

## Non-regression rule

This feature must not change:

- `/price-lists` normal pricing
- `/catalog` share creation
- public buyer share token validation
- PDF/question/selection flows
- catalog share to quote conversion
- existing quote override fields

## Future implementation plan

Recommended next phase after review:

1. Add internal Approval Inbox view for buyer pricing plans.
2. Add approve/reject endpoints with audit trail.
3. Add share wizard warning when a buyer pricing plan is pending.
4. Allow buyer-specific plan selection only when approved.
5. When approved, quote conversion can copy buyer-specific pricing into quote line override fields with `override_reason` and `catalog_price_amount` preserved.
