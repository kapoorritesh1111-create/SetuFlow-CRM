# SOP — Order Execution and Dispatch Evidence

## Purpose
Advance accepted work through governed execution posture in `/orders` using explicit document, compliance, release, dispatch, and completion evidence.

## Repo source anchors
- `src/lib/order-execution.ts`
- `src/lib/order-operations.ts`
- `src/features/orders/server/actions.ts`
- `src/app/(app)/orders/page.tsx`

## State model
| State | Next state | What must be true |
| --- | --- | --- |
| `draft` | `ready` | accepted quote, linked contract, signed contract posture, commercial lock state `accepted_locked`, and confirmed line continuity |
| `ready` | `released` | all `draft -> ready` conditions plus document-rule clearance, compliance clearance, and release artifact evidence |
| `released` | `dispatched` | release completed plus dispatch artifact evidence |
| `dispatched` | `completed` | dispatch recorded plus completion evidence |
| `completed` | none | execution closed |

## Evidence rules enforced in the current baseline
### Release-stage artifacts
- Commercial invoice
- Packing list
- Certificate of origin evidence when origin-sensitive lines exist

### Dispatch-stage artifacts
- Export clearance evidence when export-sensitive lines exist
- Transport document such as bill of lading, airway bill, lorry receipt, dispatch note, or shipment release

### Completion-stage artifacts
- Proof of delivery or equivalent completion note

## Access rules
An operator can progress order execution only with either:
- `lead.manage`, or
- `compliance.review`

## Operator steps
### 1. Confirm the order is actually ready for the next state
Read the execution summary in the order card. The server will reject out-of-sequence transitions, so use the visible next state only.

### 2. Review the blocker buckets
The order evaluation combines:
- contract lock and line continuity
- document requirement reasons
- compliance requirement reasons
- release artifact reasons
- dispatch artifact reasons
- completion artifact reasons

### 3. Clear blockers in sequence
Do not try to solve dispatch or completion gaps before release fundamentals are clear.

#### To move `draft -> ready`
Clear:
- missing signed contract posture
- missing `accepted_locked` commercial lock state
- missing confirmed quote lines

#### To move `ready -> released`
Clear:
- document-rule blockers
- compliance blockers
- release artifact blockers

#### To move `released -> dispatched`
Clear:
- dispatch artifact blockers
- any remaining document or compliance blockers

#### To move `dispatched -> completed`
Clear:
- proof-of-delivery or equivalent completion evidence

### 4. Progress the state
Use the order action form. The server recomputes the governed execution snapshot before saving and writes audit history on success.

### 5. Verify downstream sync posture
Execution state also affects governed integration queue readiness. If the order is meant to feed freight or ERP continuity, re-check `/integrations` after state progression.

## Common failure modes
| Failure | Meaning | Required action |
| --- | --- | --- |
| `order-state-out-of-sequence` | Submitted state does not match the server's next allowed state | Refresh and use the visible next action only |
| `order-state-blocked: ...` | One or more blockers remain | Clear the listed reasons first |
| `order-contract-missing` | No contract is linked | Restore contract continuity |
| Read-only notice | User lacks required capability | Use an operator with proper access |

## Done criteria
An execution transition is complete only when:
- the new execution state is saved on the contract
- the execution snapshot recomputes without blockers for that transition
- required evidence is visible on the order card
- the audit trail captures the progression event
