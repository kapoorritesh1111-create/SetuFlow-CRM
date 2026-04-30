# Golden Demo Path

Updated: 2026-04-30  
Baseline: PR-NS-19 Controlled Golden Acceptance Run and Orders Proof

## Canonical path

```text
Capture / Lead
-> Product or Category Interest
-> Quote from catalog baseline
-> Sent quote
-> Accepted quote
-> Order / Contract
-> Execution
```

## Named live golden journey

PR-NS-19 completed the controlled live acceptance run for the approved golden candidate.

| Demo object | Live value |
|---|---|
| Lead | `Setu Groups` / `Ritesh Kapoor` |
| Lead ID | `262ddf46-ecfe-4385-aaf5-18387d2a79f9` |
| Quote | `Q-00025` |
| Quote ID | `b6f8111a-3b32-456d-92f0-412c898bf13b` |
| Current / accepted version | `7f8efd6b-6e19-4941-b974-a5fc61738b0f` |
| Contract / order execution record | `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` |
| Commercial lines | 11 quote lines, 11 quote-version lines, 11 contract lines |

## Current proof level

| Checkpoint | State | Evidence |
|---|---|---|
| Lead exists | Proven live | Named buyer record exists. |
| Quote exists | Proven live | `Q-00025` exists with 11 line items. |
| Sent quote | Proven live before acceptance | Parent quote and current version were both `sent` before PR-NS-19 mutation. |
| Accepted outcome | Proven live | `quotes.status=accepted`, `quote_versions.status=accepted`, and `quotes.accepted_version_id=7f8efd6b-6e19-4941-b974-a5fc61738b0f`. |
| Order / contract handoff | Proven live | Contract `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` exists for quote `Q-00025`. |
| Execution workspace source visibility | Proven by source query | The Orders source query can return accepted quote `Q-00025` with contract `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` and execution state `draft`. |

## Demo script note

Use this investor-safe wording:

> “This is the live golden buyer journey for Setu Groups. The quote Q-00025 moved from sent to accepted, created a contract/order execution record, and carried all 11 commercial lines into the execution workspace. The order is now in draft execution posture, ready for the next proof layer: document blockers, commercial lock evidence, release readiness, and dispatch controls.”

Do not claim dispatch or completion is proven yet. PR-NS-19 proves accepted quote to draft order execution handoff, not shipment execution.

## Operational rule

Future demo/data PRs must keep these IDs current in this file, `docs/DEMO_DATA_AUDIT.md`, `docs/PR_TRACKER.md`, and `public/internal-dcc/index.html`. If the live record is changed, record the before/after state and whether production data was mutated.
