# SOP — Document and Compliance Review

## Purpose
Clear the document-rule and compliance blockers that gate quote send, contract progression, and downstream order execution.

## Repo source anchors
- `src/lib/document-requirements.ts`
- `src/lib/order-operations.ts`
- `src/features/leads/components/lead-command-center.tsx`
- `src/app/(app)/orders/page.tsx`

## Governing logic
Applicable document rules are matched by:
- `lead_type`
- `market_id`
- `product_id`
- `progression_scope`

Supported scopes in the current baseline:
- `general`
- `quote_send`
- `contract_progression`

A rule is satisfied only when a matching non-expired document exists in an approved status.

### Document status interpretation
| Status bucket | Statuses |
| --- | --- |
| Approved / clear | `approved`, `complete`, `completed`, `ready` |
| Pending / still blocking | `pending`, `submitted`, `in_review`, `pending_review`, `revision_requested` |
| Expired | any matching document with `expires_at` before today and no non-expired approved replacement |

### Compliance status interpretation
Compliance is clear only when items are in one of:
- `approved`
- `complete`
- `completed`
- `waived`

Anything else remains an open blocker.

## Operator steps
### 1. Confirm the scope
Decide whether you are clearing blockers for:
- quote send
- contract progression
- order release / dispatch readiness

### 2. Identify the applicable rules
Use the linked lead context to confirm:
- lead type
- markets
- product interests / confirmed products
- requirement codes expected for that scope

### 3. Verify document metadata
For each document that is meant to satisfy a rule, confirm:
- `requirement_code` matches the rule
- `related_entity` and `related_id` point to the right lead / quote / contract
- status reflects real review state
- `expires_at` has not lapsed

A document that is uploaded without the correct requirement code or relation will not satisfy the rule.

### 4. Review compliance items
Open compliance items must be actively resolved. Pending review still blocks progression.

### 5. Re-check downstream blockers
After updates, verify the blocker summaries disappear from the affected surfaces:
- lead command center
- pipeline readiness
- contracts workspace
- orders workspace
- dashboard evidence center

## How this affects orders
Order execution consumes the same governed truth and then adds artifact evidence requirements. Clearing document/compliance blockers is necessary but not sufficient for release, dispatch, or completion.

## Common failure modes
| Failure | Meaning | Required action |
| --- | --- | --- |
| Missing rule still reported | No approved matching document exists | Upload or fix metadata/status |
| Pending review still reported | Document exists but has not cleared review | Finish review and approve or replace |
| Expired rule still reported | Only expired evidence is on file | Upload a valid replacement |
| Compliance blocker still reported | Item not in a clear state | Approve, waive, or complete it |

## Done criteria
The review is complete only when:
- blocker reasons are empty for the targeted scope
- required rule counts show as satisfied
- open compliance count is zero for the targeted progression path
