# Final Customer-Facing Launch Packet — Pass 14

> Pass 14 records evidence available at the time of the handoff. No production data was mutated, no Supabase migrations were applied, and frozen proof records were not changed.

## What SETU Flow can safely say

SETU Flow can safely present itself as a governed commercial CRM for export/import workflows with a proven lead-to-accepted-quote-to-signed-contract golden journey. The live golden record now verifies that quote `Q-00025` is accepted, contract/order `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` is signed, and 11 contract lines are preserved.

## What SETU Flow cannot yet claim

SETU Flow cannot yet claim broad production launch readiness, external security audit completion, Supabase advisor closure, deployed WAF/rate-limit proof, monitoring/backup proof, live ERP/freight connector proof, dispatch/completion proof, first-customer pilot success, or mobile-native parity.

## Pilot operating model

Run a controlled pilot with named owner, limited users, known role assignments, documented manual fallback, and evidence capture for every commercial event.

## Support model

Support readiness is documented, but formal SLA, 24/7 support, alert routing, and ticketing proof are pending unless separately supplied.

## Security posture

Middleware/header posture, app-layer role/capability tests, and live Supabase RLS-enabled table inventory are documented. Supabase advisor findings remain open and must be disclosed.

| Customer topic | Safe statement | Evidence | Limitation |
|---|---|---|---|
| Core CRM workflow | SETU Flow supports governed lead, catalog, quote, approval, acceptance, and contract/order handoff workflows. | DCC, README, tests, golden journey. | Production-scale evidence still pending. |
| Golden record | The live golden journey includes accepted quote Q-00025 and signed contract/order `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e`. | Live Supabase read-only proof. | Frozen proof record; do not mutate. |
| Commercial line preservation | The signed contract/order preserves 11 line items. | Live Supabase contract line count. | Dispatch/completion proof still missing. |
| Security posture | All public tables inspected by connector have RLS enabled. | Supabase `list_tables` evidence: 80 public tables, all RLS enabled. | Advisor findings and RPC grant risks remain open. |
| Supabase remediation status | Remediation is planned and documented. | Pass 8/9 remediation plans. | Not applied live. |
| External audit | Audit prep docs exist. | Audit prep and auditor response pack. | No completed external audit report. |
| WAF/rate limiting | WAF/rate-limit evidence checklist exists. | Pass 8/10 evidence docs. | No deployed WAF proof. |
| Monitoring/backups | Monitoring and backup evidence checklist exists. | Pass 11/12 docs. | No live monitoring/restore proof. |
| Live integrations | Integration architecture and proof-mode docs exist. | Repo docs/tests. | No live ERP/freight connector proof. |
| Mobile parity | Mobile-native parity is not claimed. | Frozen claim archive. | Trade-event capture wedge only. |
| Support readiness | Support activation checklist exists. | Pass 13 support activation doc. | No formal SLA or alert-routing evidence. |

## Evidence checklist for customer pilot

- Confirm pilot workspace and admin owner.
- Create new pilot proof record separate from Q-00025.
- Capture first lead, quote, acceptance, contract/order, signature, documents, dispatch, support, and feedback evidence.
- Capture WAF/monitoring/backup evidence before broad production launch.
