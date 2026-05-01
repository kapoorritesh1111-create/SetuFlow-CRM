# Pilot Launch Evidence Capture - Pass 10

**Purpose:** Capture real first-pilot evidence without mutating the frozen golden record.

Do **not** use or mutate quote `Q-00025` or contract/order `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` for pilot proof. Create a new proof record.

## Capture checklist

| Evidence item | Record ID / screenshot / export | Owner | Captured? | Notes |
|---|---|---|---|---|
| Pilot workspace setup evidence | Organization ID, organization settings screenshot/export | Workspace owner | No | Confirm approval threshold and org identity |
| User/role setup evidence | Invitation IDs, member list, role matrix screenshot/export | Admin | No | Include owner/admin/sales/operations/viewer as applicable |
| Product/pricing setup evidence | Product IDs, pricing rule set IDs, quote-ready screenshot/export | Catalog owner | No | At least one quote-ready product required |
| First lead evidence | Lead ID and audit log entry | Sales owner | No | New pilot lead only |
| First quote evidence | Quote ID and quote version ID | Sales owner | No | Must not use Q-00025 |
| Accepted quote evidence | Accepted quote status and audit log | Sales/owner | No | Capture timestamp and actor |
| Contract/order evidence | Contract/order ID created from accepted quote | Operations owner | No | Capture generated status |
| Signed contract evidence | Signed timestamp, commercial lock state, audit log | Authorized signer | No | Required before 100/100 claim |
| Document evidence | Uploaded document metadata and review state | Operations/compliance | No | Capture file metadata, not secret content |
| Dispatch evidence | Dispatch record/evidence and audit log | Operations owner | No | Required before dispatch-live claim |
| Support/incident evidence | Support ticket/log if any issue occurs | Support owner | No | Use production support runbook severity |
| Customer feedback evidence | Written pilot feedback or acceptance note | Founder/customer owner | No | Needed for first-pilot evidence |

## Evidence storage guidance

- Store screenshots/exports in the approved customer evidence folder.
- Include record IDs in this checklist after each step.
- Do not paste secrets or service-role credentials into evidence artifacts.
- If a step fails, capture the error state and support triage rather than overwriting proof.

## Pilot completion criteria

A pilot is evidence-complete only when:

1. A new proof lead/quote/order chain exists.
2. The quote is sent and accepted.
3. Contract/order exists and is signed.
4. Required documents are uploaded/reviewed.
5. Dispatch evidence exists if the transaction has reached dispatch.
6. Audit logs support every key transition.
7. Customer feedback is captured.
