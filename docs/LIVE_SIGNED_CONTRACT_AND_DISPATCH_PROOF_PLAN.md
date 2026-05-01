# SETU Flow CRM — Live Signed-Contract and Dispatch Proof Plan

**Status:** Pass 7 proof plan  
**Purpose:** Prove the remaining live revenue-path evidence without mutating the frozen golden record.

## 1. Why not to mutate Q-00025

- Q-00025 is the frozen proof artifact for the Setu Groups journey.
- Contract `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` should remain reproducible and untouched.
- Future proof should use a separate pilot quote/contract so the existing demo artifact remains stable for investor and buyer demos.

## 2. New proof record plan

1. Create a separate pilot lead or use an explicitly approved pilot lead.
2. Create a separate pilot quote.
3. Accept the quote through the normal app flow.
4. Generate or verify the linked contract/order execution record.
5. Sign the contract through the app flow.
6. Upload required order/compliance documents.
7. Progress execution through allowed gates.
8. Add dispatch evidence only when real dispatch proof exists.
9. Mark complete only if the order is truly shipped/completed.
10. Capture audit log evidence for every state transition.

## 3. Evidence to capture

| Evidence item | Why it matters | Status |
|---|---|---|
| Quote ID | Identifies the new proof quote. | Pending |
| Contract/order ID | Identifies the new execution proof record. | Pending |
| Audit log entries | Proves who did what and when. | Pending |
| Signed timestamp | Proves contract-signing action occurred. | Pending |
| Commercial lock state | Proves accepted quote values are preserved. | Pending |
| Document upload metadata | Proves required evidence was attached. | Pending |
| Dispatch evidence | Proves operational dispatch. | Pending |
| Completion state | Proves final order completion only when true. | Pending |

## 4. Negative controls

- Viewer cannot sign or progress execution.
- Sales cannot perform compliance-only actions unless their role grants the required capability.
- Operations can progress allowed execution gates where permitted.
- Direct RPC testing should wait until Supabase grants are hardened; otherwise, test app-layer gates first and avoid mutating live data.

## 5. Proof table

| Proof step | Evidence | Status | Notes |
|---|---|---|---|
| Create separate pilot quote | Quote ID | Pending | Do not reuse Q-00025. |
| Accept quote | Accepted status + audit log | Pending | Capture timestamp. |
| Generate contract/order | Contract/order ID | Pending | Verify line preservation. |
| Sign contract | `signed_at`, audit log | Pending | Use app flow only. |
| Upload documents | Document metadata | Pending | Capture upload/review state. |
| Progress execution | Status transition + audit log | Pending | Role-gated action. |
| Add dispatch proof | Dispatch evidence | Pending | Only if actual dispatch occurred. |
| Complete order | Completion state | Deferred | Only if actually shipped/completed. |

## 6. Honest current status

Pass 7 provides the proof plan, not the live proof itself. Buyer confidence can improve because the launch/proof path is operationally clear, but 100/100 requires the actual live signed-contract and dispatch evidence plus remaining production/security proof.
