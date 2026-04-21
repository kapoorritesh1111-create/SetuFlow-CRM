# Quote / Approval / Order Audit

## Purpose

This file reconciles the quote, approval, and order truth story after PR-31.

## Canonical commercial contract

The commercial truth contract is now:

1. catalog/base price is upstream truth
2. quote builder may create final line pricing from that baseline
3. if a line is overridden, the override must carry reason
4. if policy threshold is met, approval must remain visible and valid
5. only accepted quotes enter the Orders workspace
6. contracts and contract line items preserve downstream continuity

## Proven evidence already present in the repo

### Quote governance

The quote workflow already models:

- `override_reason`
- `approval_required`
- `approval_state`

This means quote pricing discipline is not merely narrated in docs; it is represented in the runtime workflow.

### Order admission rule

The orders workspace is intentionally based on accepted quotes. This is the key reconciliation rule that removes ambiguity between quote activity and order truth.

### Contract continuity rule

Contracts preserve the relationship to the source quote using `quote_id`, and contract line items preserve:

- final unit price
- catalog price amount
- catalog price currency
- override state
- override reason

## What is fully proven

| Claim | State |
|---|---|
| Catalog price is the default commercial source of truth | Proven |
| Quote overrides require reason capture | Proven |
| Approval state is modeled when approval is required | Proven |
| Orders represent accepted quote truth | Proven |
| Contract line continuity preserves baseline and final commercial values | Proven |

## What is only partially proven

| Claim | State | Why |
|---|---|---|
| Best approval-governed accepted deal can already be shown cleanly | Partial | Workflow supports it, but showcase data quality is still not ideal. |
| Execution continuity is mature enough for a diligence-grade story | Partial | Structurally present, but visible examples remain draft-heavy. |
| External integration proof validates the whole commercial path | Open | Not yet demonstrated live. |

## Reconciliation conclusion

There is no need to weaken or rewrite the pricing contract. The repo already supports the right governed posture. PR-31 simply makes the following interpretation explicit:

- **quote status** drives whether commercial work is merely proposed or operationally real
- **approval visibility** matters when policy threshold is crossed
- **accepted quote truth** is the handoff into orders/contracts
- **contract continuity** preserves what was commercially agreed
