# SETU Flow Investor Readiness

Updated: 2026-04-30  
Baseline: PR-NS-19 Controlled Golden Acceptance Run and Orders Proof

## Current investor posture

PR-NS-19 upgrades the investor story from “candidate prepared” to “live accepted-order handoff proven.” The named golden record now supports a controlled demo through accepted quote and draft order execution.

## Named golden journey

| Field | Live value |
|---|---|
| Buyer | `Setu Groups` |
| Contact | `Ritesh Kapoor` |
| Lead ID | `262ddf46-ecfe-4385-aaf5-18387d2a79f9` |
| Quote | `Q-00025` |
| Quote ID | `b6f8111a-3b32-456d-92f0-412c898bf13b` |
| Version ID | `7f8efd6b-6e19-4941-b974-a5fc61738b0f` |
| Contract / order execution ID | `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` |
| Commercial lines | 11 quote lines, 11 version lines, 11 contract lines |

## Investor-ready claim status

| Claim | Status after PR-NS-19 |
|---|---|
| “The system has real buyer/quote data.” | Supported. |
| “The sent quote can become accepted safely.” | Supported live on Q-00025. |
| “This named live record completed accepted-to-order handoff.” | Supported through draft contract/order execution. |
| “Orders has a live contract for this accepted quote.” | Supported by contract `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e`. |
| “All order execution, documents, dispatch, and completion are proven.” | Not yet supported. |
| “RPC/RLS hardening is complete.” | Not yet supported. |

## Honest investor script

Use this wording after PR-NS-19:

> “This is the live golden buyer journey. Setu Groups’ quote Q-00025 was sent, accepted, and handed off into Orders as contract d129ffe2-c913-4cf7-9a7b-86ea6c9da54e with all 11 commercial lines preserved. The next proof layer is operational execution: document blockers, release readiness, dispatch evidence, and RPC permission hardening.”

Avoid saying:

- “The order has shipped.”
- “The contract is signed and active.”
- “All Supabase RPC/RLS advisor findings are closed.”
- “The mobile-native promise is fully proven.”

## Investor confidence impact

PR-NS-19 raises confidence because the core revenue handoff is now backed by live IDs and line-count continuity. The next investor-risk reducers are PR-NS-20 RPC hardening and PR-NS-22 order execution proof hardening.


## PR-NS-20 investor update

PR-NS-20 reduces security-trust risk around the quote/order path. Scoped quote/order SECURITY DEFINER RPCs were hardened by removing anonymous/broad PUBLIC execution and preserving authenticated application execution. Quote/order helper functions were pinned to `search_path=public` where safe.

The live golden journey still holds after hardening:

| Proof point | Live value |
|---|---|
| Quote | `Q-00025` / `b6f8111a-3b32-456d-92f0-412c898bf13b` |
| Quote status | `accepted` |
| Accepted version | `7f8efd6b-6e19-4941-b974-a5fc61738b0f` |
| Contract/order execution | `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` |
| Contract lines | `11` |

Updated investor wording:

> “The live golden quote-to-order path is proven, and the quote/order RPC surface has been narrowed so anonymous execution is no longer available on the scoped workflow RPCs while authenticated app flows remain intact.”

Do not claim all Supabase advisor findings are closed; PR-NS-20 intentionally scoped to quote/order workflow findings only.

## PR-NS-21 investor update

PR-NS-21 locks the mobile promise so investor language no longer overclaims mobile-native parity.

Supported investor wording:

> The proven revenue path is desktop-first today: Q-00025 is accepted and linked to draft order execution with all 11 lines. Mobile is positioned as a targeted trade-event capture wedge, including scoped offline lead queueing, not full workflow parity.

Avoid saying:
- The mobile-native promise is fully proven.
- The full quote/order path is phone-first.
- The entire CRM works offline.
- Mobile app parity is complete.

Impact: investor demo safety improves because mobile claims now match what can be shown without inventing unproven features.

## PR-NS-22 investor update

PR-NS-22 improves investor credibility by making the Orders workspace honest instead of overclaiming execution maturity.

Safe demo line:

> Q-00025 is accepted, has a contract/order record, and preserves all 11 commercial lines. Orders shows the blocker truth: no release or dispatch until signed contract and shipment documents are uploaded and approved.

Avoid:

- Q-00025 is dispatch-ready.
- The order has shipped.
- The order is complete.
- Mobile order execution is proven.

Investor readiness is now stronger because the workspace demonstrates operational discipline: accepted orders do not silently become dispatch-ready without evidence.

## PR-NS-23 investor update

PR-NS-23 strengthens the trade-show wedge story without inflating the mobile promise.

Safe investor line:

> Trade Events already shows event-sourced pipeline follow-through: Anuga, Gulfood, and IndusFood have live linked leads and quote handoffs, with Gulfood and IndusFood also showing contract handoffs. The mobile wedge is the booth capture/intake path; offline queueing remains scoped to capture and should not be described as full offline CRM.

Avoid:

- “The trade-show offline queue has proven production sync volume.”
- “SETU Flow is fully mobile-native.”
- “Quotes and Orders are mobile execution workflows.”
