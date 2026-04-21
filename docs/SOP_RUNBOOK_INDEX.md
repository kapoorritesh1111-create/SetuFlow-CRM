# SOP / Runbook Index

This pack is the governed operator reference for the current repo baseline. It complements the internal DCC and should be refreshed whenever workflow logic changes.

## Included documents

| Document | Purpose |
| --- | --- |
| `docs/SOP_CONTRACT_PROGRESSION.md` | Progress contracts without breaking commercial lock, document rules, or linked quote/lead continuity. |
| `docs/SOP_DOCUMENT_COMPLIANCE_REVIEW.md` | Clear document-rule and compliance blockers that gate quote send, contract progression, and downstream execution. |
| `docs/SOP_ORDER_EXECUTION_AND_DISPATCH_EVIDENCE.md` | Advance orders through draft, ready, released, dispatched, and completed posture with explicit evidence checks. |
| `docs/SOP_AI_DECISION_REVIEW.md` | Review AI drafts and governed decision cards while preserving action-safe guardrails. |
| `docs/RUNBOOK_INTEGRATION_REPLAY_AND_GOVERNED_SYNC.md` | Handle inbound validation failures, replay requests, and safe outbound sync queueing. |

## Source anchors in repo
- Contract progression: `src/features/contracts/server/actions.ts`
- Document requirements: `src/lib/document-requirements.ts`
- Order execution state machine: `src/lib/order-execution.ts`
- Order operational controls: `src/lib/order-operations.ts`
- AI governed decisions: `src/features/ai/logic/intelligence.ts`
- AI draft review/apply actions: `src/features/ai/server/actions.ts`
- Integrations webhook and queue/replay actions: `src/app/api/integrations/webhooks/[provider]/route.ts`, `src/features/integrations/server/actions.ts`, `src/features/integrations/server/governed-sync.ts`

## Non-negotiables
- Treat the repo as the source of truth.
- Do not weaken quote override approval logic.
- Do not use AI or integrations to bypass document, compliance, contract, or execution controls.
- Refresh this pack and `public/internal-dcc/index.html` in the same pass when governed workflow behavior changes.
