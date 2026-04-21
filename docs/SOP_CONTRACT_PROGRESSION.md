# SOP — Contract Progression

## Purpose
Progress contracts through the supported statuses without breaking linked quote/lead continuity or bypassing contract-progression document and compliance controls.

## Repo source anchors
- `src/features/contracts/server/actions.ts`
- `src/features/contracts/components/contracts-workspace.tsx`
- `src/lib/document-requirements.ts`
- `src/lib/contract-lock.ts`

## Supported statuses
| Current | Allowed next statuses |
| --- | --- |
| `draft` | `signed`, `cancelled` |
| `signed` | `active`, `cancelled` |
| `active` | `completed`, `cancelled` |
| `completed` | `active` |
| `cancelled` | `active` |

## Access rules
- Viewing the workspace requires an authenticated workspace membership.
- Updating contract workspace details requires the `lead.manage` capability.
- Progressing contract status requires the `quote.send` capability.

## Preconditions before progression
1. The contract must exist in the active organization.
2. The contract must still be linked to a lead and quote.
3. For progression into `signed`, `active`, or `completed`, the lead must clear the `contract_progression` guard:
   - required document rules are satisfied or approved
   - no required document reviews are still pending
   - no required documents are expired
   - open compliance items are cleared, waived, or completed
4. The accepted-quote commercial lock snapshot is treated as downstream governed truth. Do **not** use Contracts to soften quote override governance.

## Operator steps
### 1. Review the contract desk
Check:
- linked lead and linked quote context
- commercial lock state and pricing basis
- line continuity snapshot count
- open compliance blockers on the linked lead
- related documents attached to lead / quote / contract context

### 2. Update workspace details if needed
Use the contract workspace editor to set:
- `starts_on`
- `ends_on`
- operator notes

This updates workspace details only. It does not replace commercial lock truth.

### 3. Choose only the next allowed status
The server rejects out-of-sequence transitions. Use the next allowed status buttons in the workspace and add notes that explain why the state is changing.

### 4. Resolve any guard failures
If progression is blocked, resolve the named blockers first:
- missing document rule coverage
- pending document review
- expired document
- open compliance item
- missing linked quote or lead context

### 5. Re-submit after blockers clear
Successful progression runs the governed transaction path and revalidates:
- `/contracts`
- `/documents`
- `/compliance`
- `/leads`
- the linked lead detail route

## Audit posture
Blocked or successful progression writes audit history through contract audit events. Treat audit notes as part of the release-grade evidence trail.

## Common failure modes
| Failure | Meaning | Required action |
| --- | --- | --- |
| `Contract cannot move from X to Y` | Transition is out of sequence | Use only an allowed next status |
| `Linked lead context is missing` | Contract continuity is broken | Restore link before progressing |
| `Linked quote context is missing` | Quote-to-contract continuity is broken | Restore link before progressing |
| `Contract cannot progress yet: ...` | Document/compliance guard failed | Clear the listed blockers first |
| Read-only message | User lacks required capability | Use an operator with the right role |

## Done criteria
A contract progression change is complete only when:
- the new contract status is saved
- linked continuity remains intact
- blocker reasons are cleared for the targeted state
- audit history reflects the action
