# Golden Demo Path

## Purpose

This file defines the one canonical buyer/investor path that should be used in demos after PR-31.

## Canonical path

```text
Capture / Lead
-> Product or Category Interest
-> Quote from catalog baseline
-> Override only if needed
-> Override reason required
-> Approval required when policy threshold is met
-> Accepted quote
-> Order / Contract
-> Execution
```

## Why this is the best path already present in the repo

This path is the most coherent because it matches the current code and documentation posture instead of inventing an idealized future flow.

### Step-by-step rationale

1. **Lead capture exists and is commercially legible.**
2. **Interest is attached to the commercial record, not hidden in freeform notes.**
3. **Quote starts from catalog truth.**
4. **Override logic is governed, not silent.**
5. **Approval remains part of the story where policy requires it.**
6. **Accepted quote is the handoff into Orders.**
7. **Contract/order continuity preserves line-level commercial truth.**
8. **Execution continues the record, even though proof maturity still needs work.**

## Proven checkpoints

| Checkpoint | State | Why |
|---|---|---|
| Catalog baseline | Proven | Product pricing is treated as upstream truth. |
| Override reason | Proven | Quote workflow validates reason capture for overridden lines. |
| Approval posture | Proven | Approval state is explicitly modeled and validated when required. |
| Accepted quote to Orders | Proven | Orders is scoped to accepted quotes. |
| Contract continuity | Proven | Contracts link by `quote_id` and preserve line-level commercial values. |

## Inferred or incomplete checkpoints

| Checkpoint | State | Why |
|---|---|---|
| Best approval-required accepted sample | Inferred | The workflow supports it, but the cleanest seeded demo record still needs stronger showcase quality. |
| Strong execution maturity | Partial | States and blockers exist, but visible runtime examples are still light. |
| Integration-backed end-to-end proof | Open | This remains a future pass. |

## Demo rule

When presenting this path, do not add optional branches unless they strengthen understanding. The purpose of this file is to keep the demo story clean, singular, and non-technical.
