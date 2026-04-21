# SOP — AI Decision Review

## Purpose
Use AI assistance for operator review and prioritization without allowing AI to mutate governed workflow truth automatically.

## Repo source anchors
- `src/features/ai/components/ai-suggestions-workspace.tsx`
- `src/features/ai/server/actions.ts`
- `src/features/ai/logic/intelligence.ts`
- `src/features/dashboard/components/dashboard-ai-governance.tsx`

## Guardrails
The current baseline enforces these non-negotiables:
- AI does not change record state automatically.
- AI does not approve quote overrides or pricing exceptions.
- AI does not clear compliance, document, or execution blockers.
- AI cannot release, dispatch, or complete an order automatically.
- AI cannot send commercial terms on its own.
- AI only routes the next safe action using repo-backed workflow truth.

## Review surfaces
- `/ai-suggestions` for draft review and prioritized decisions
- `/dashboard` for bounded AI governance cards
- lead, quote, and order workspaces for the underlying governed truth

## Draft lifecycle
| Status / outcome | Meaning |
| --- | --- |
| `generated` / pending | AI created a draft for review |
| `reviewed` | Operator reviewed but did not yet approve or dismiss |
| `approved` | Operator approved the draft for use |
| `dismissed` | Operator rejected the draft |
| `applied` | A communication draft was created from the AI output |

Applying an AI draft creates a communication draft. It does **not** auto-send.

## Operator steps
### 1. Read the governed rationale first
For any draft or decision card, inspect:
- why AI is recommending the action
- what repo data bounds the suggestion
- which guardrails prevent autonomous action

### 2. Validate against the source workspace
Open the linked lead, quote, order, or dashboard action and confirm the blockers are real.

### 3. Add operator notes
Use operator notes for:
- review context
- additional guardrails
- reasons for approval or dismissal
- evidence the draft should reference before use

### 4. Choose the correct disposition
- **Mark reviewed** when the draft is valid but not yet approved.
- **Approve** when the draft is acceptable for operator use.
- **Dismiss** when the logic or message is not safe to use.
- **Create communication draft** only when the draft family supports downstream communication drafting.

### 5. Verify audit trail
Draft generation, review, approval, dismissal, and application all write audit history. Use this to support release-grade review posture.

## What “bounded by repo truth” means
Examples from the current baseline:
- lead decisions use follow-ups, compliance posture, pending tasks, and recency already stored in the repo
- quote decisions use status, linked documents, communication history, and accepted-contract visibility
- order decisions reuse contract lock, document rules, compliance state, and execution evidence
- dashboard decisions route the same blockers already visible in the governed workspaces

## Common failure modes
| Failure | Meaning | Required action |
| --- | --- | --- |
| AI says to move forward but blocker still exists | Source workspace truth wins | Clear blocker first or dismiss the draft |
| Operator wants AI to approve/send automatically | Guardrail violation | Keep the review in operator hands |
| AI decision lacks context | Repo data may be incomplete | Refresh source records, then regenerate if needed |

## Done criteria
An AI review is complete only when:
- the operator disposition is saved
- operator notes explain the decision when needed
- any created communication draft is still reviewed before send
- the governed source workspace still agrees with the AI rationale
