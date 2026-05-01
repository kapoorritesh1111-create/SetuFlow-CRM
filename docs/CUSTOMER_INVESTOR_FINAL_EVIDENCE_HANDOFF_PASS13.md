# Pass 13 — Customer / Investor Final Evidence Handoff

This document summarizes what can safely be shared with customers or investors after Pass 13. It uses evidence already present in the repo and explicitly separates missing evidence.

| Evidence area | Current evidence | Safe wording | Missing evidence | Upgrade condition |
|---|---|---|---|---|
| Core CRM workflow | DCC, README, tests, golden journey Q-00025, quote/order docs. | Core commercial workflow is substantially implemented and demoable in a controlled path. | Unscripted production-scale proof. | Successful pilot with evidence and low incident rate. |
| Golden record | Frozen Q-00025 and contract/order `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e`. | A frozen demo proof record exists and must not be mutated. | New pilot proof record. | Create and close a new live pilot proof path. |
| Security posture | Middleware hardening docs, RLS enabled on 80/80 public tables, advisor reviews, tests. | Security posture has been reviewed and hardening plans exist. | Advisor closure, external audit, applied migrations. | Apply remediation and capture before/after evidence. |
| Supabase remediation status | Pass 8/9/12/13 plans and draft migrations. | Remediation is planned and ready for review. | Applied remediation. | Explicit authorization, migration execution, advisor re-check. |
| External audit | Audit prep and auditor response pack. | Audit preparation pack exists. | Completed third-party audit. | Auditor report and remediation tracker closure. |
| WAF/rate limiting | WAF plan and evidence checklist. | Required WAF evidence is defined. | Deployed WAF/rate-limit proof. | Provider evidence, rule exports, test request logs. |
| Monitoring/backups | Monitoring proof checklist. | Monitoring/backup evidence requirements are documented. | Actual monitoring alerts and restore drill. | Capture alert evidence and restore drill report. |
| Pilot proof | Pilot checklist, operations checklist, evidence templates. | Pilot process is ready to run conditionally. | Actual pilot evidence and feedback. | First customer pilot evidence captured. |
| Signed contract proof | Sign-contract gate and proof plan. | Signing flow has a proof plan and application gate. | New live signed-contract proof. | New pilot record signed and audited. |
| Dispatch proof | Dispatch proof plan and checklist. | Dispatch proof process is defined. | New live dispatch/completion proof. | New pilot record progresses with dispatch evidence. |
| Live integrations | Integration tests and mock/proof-mode docs. | Integration framework is governed; live connectors are not claimed. | Live ERP/freight connector proof. | Provider-connected sync evidence. |
| Mobile parity | Mobile-native parity explicitly not claimed. | Trade-event capture is a supporting wedge; mobile-native parity is not claimed. | Full mobile workflow evidence. | Build and verify mobile-native workflow. |
| Support readiness | Runbook and support activation checklist. | Support process is documented, but activation is pending. | Named owners, ticketing, alert routing, SLA evidence. | Activate support tooling and capture evidence. |

## Handoff rule

Use only the safe wording above in customer/investor conversations until the missing evidence is closed.
