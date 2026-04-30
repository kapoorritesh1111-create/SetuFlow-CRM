# SETU Flow Release Readiness

Updated: 2026-04-30  
Baseline: PR-NS-19 Controlled Golden Acceptance Run and Orders Proof

## Readiness snapshot

| Area | Honest readiness |
|---|---:|
| Core CRM workflow | 80–84% |
| Quote → Order revenue path | 82–88% |
| Investor demo safety | 78–84% scripted; still lower if unscripted |
| First paying customer readiness | 68–74% |
| Mobile-native promise | 40–50% until mobile scope is reconciled |
| Sprint completion toward current NorthStar | 76% |

## PR-NS-19 release gate result

PR-NS-19 materially improved release confidence because the named golden record is no longer just a candidate. The live path now proves:

```text
Lead -> Quote -> Sent -> Accepted -> Draft Order / Contract Execution
```

Live proof:

| Proof point | Live value |
|---|---|
| Quote | `Q-00025` |
| Quote ID | `b6f8111a-3b32-456d-92f0-412c898bf13b` |
| Accepted version | `7f8efd6b-6e19-4941-b974-a5fc61738b0f` |
| Contract/order execution record | `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` |
| Contract line count | `11` |
| Execution state | `draft` |

## What is now stronger

- The golden record is accepted in live Supabase.
- Quote and quote-version statuses are aligned at `accepted`.
- The accepted quote handoff creates a contract/order execution record.
- Contract line count matches the quote line count.
- The accepted-handoff RPC now handles schemas where `contract_line_items.organization_id` is required.
- The Orders source query can return the accepted quote with its draft execution record.
- The DCC PR queue has been restored to the full 9-item roadmap.

## Remaining release blockers

1. RPC/RLS permission hardening needs role-safe implementation and regression testing.
2. Order execution proof needs richer blockers, documents, continuity, next-action, release, and dispatch evidence.
3. Contract signing posture is still draft; signed/active contract readiness is not proven.
4. Mobile promise alignment remains unresolved.
5. Integrations and first-login empty state still need proof passes before broad buyer rollout.

## Release decision

PR-NS-19 supports a controlled investor demo of accepted quote to draft order execution. It does not yet support a claim that SETU Flow is fully launch-ready or that post-order fulfilment is proven end-to-end.


## PR-NS-20 release update

PR-NS-20 improves release trust by narrowing the most relevant quote/order RPC exposure without changing runtime application code.

| Area | Honest readiness after PR-NS-20 |
|---|---:|
| Core CRM workflow | 81–85% |
| Quote → Order revenue path | 84–89% |
| Investor demo safety | 80–86% scripted; still lower if unscripted |
| First paying customer readiness | 70–76% |
| Security/RPC trust for quote/order path | 72–80% |
| Mobile-native promise | 40–50% until PR-NS-21 |
| Sprint completion toward current NorthStar | 79% |

Live verification after hardening confirms Q-00025 remains accepted, contract `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` remains linked, and 11 contract line items remain visible.

Remaining release blockers: mobile promise alignment, richer order execution proof, integration proof mode, and final claim reconciliation.

## PR-NS-21 release update

PR-NS-21 improves release trust by removing overbroad mobile claims. It does not add mobile functionality; it aligns product wording with verified behavior.

| Area | Honest readiness after PR-NS-21 |
|---|---:|
| Core CRM workflow | 81-85% |
| Quote -> Order revenue path | 84-89% |
| Investor demo safety | 82-87% scripted; still lower if unscripted |
| First paying customer readiness | 71-77% |
| Security/RPC trust for quote/order path | 72-80% |
| Mobile truth / claim safety | 70-76% |
| Mobile-native parity | Not claimed |
| Sprint completion toward current NorthStar | 81% |

Mobile release boundary:
- Full CRM, quote authoring/editing, order execution, admin, and investor demo navigation remain desktop-first.
- Trade-event lead capture is the mobile-friendly wedge.
- Offline support is scoped to trade-event lead capture queueing and sync only.

Remaining release blockers: richer order execution proof, integration proof mode, first-login/empty-state readiness, and final claim reconciliation.

## PR-NS-22 release update

PR-NS-22 improves Orders release readiness by turning the accepted order into an honest execution workspace proof.

| Area | Honest readiness after PR-NS-22 |
|---|---:|
| Quote → order handoff | 91% |
| Orders execution proof | 86% |
| Release/dispatch evidence | 62% |
| Investor demo trust | 90% |
| Overall release readiness | 84% |

Remaining blockers: Q-00025 has zero linked execution documents, so release/dispatch/completion cannot be claimed until document evidence is uploaded and approved. The full mobile promise remains desktop-first execution plus mobile trade-event capture wedge only.

## PR-NS-23 release update

PR-NS-23 improves trade-event release credibility by separating live event-linked CRM/quote proof from unproven intake queue volume.

| Area | Honest readiness after PR-NS-23 |
|---|---:|
| Trade-event event stats | 88% |
| Trade-event lead-to-quote handoff | 86% |
| Trade-event intake queue live proof | 55% |
| Mobile promise truth | 82% |

Remaining release blocker: `trade_event_entries` has 0 live rows, so live booth intake conversion and offline queue sync cannot be claimed as proven production behavior yet.
