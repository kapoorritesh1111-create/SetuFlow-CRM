# SETU Flow CRM — Final Investor / Demo Readiness Pack

**Status:** Pass 7 demo pack  
**Audience:** Founder, operator, investor/demo presenter  
**Rule:** Demo what is proven. Do not claim production/security items that remain pending.

## 1. Demo narrative

SETU Flow is a governed commercial CRM for export/import trade. Commercial truth is the center: lead context, catalog pricing, quote versions, approvals, accepted quote state, contract/order handoff, and audit trail. AI, communications, integrations, and hardening follow commercial truth rather than replacing it.

## 2. Proven demo path

| Step | Demo proof | Notes |
|---|---|---|
| Lead | Lead command center | Use scripted path. |
| Catalog | Product and quote-ready pricing | Show pricing basis and quote readiness. |
| Pricing | Rule-based line items and overrides | Explain approval governance. |
| Quote | Q-00025 golden quote | Do not mutate. |
| Approval | Approval threshold / state | Explain governance. |
| Acceptance | Accepted quote evidence | Keep frozen demo path stable. |
| Draft order/contract | Contract/order `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` | Do not progress this record. |
| Audit trail | Admin → Audit | Show traceability. |

## 3. Honest caveats

- Signed live contract proof is still pending unless a separate Pass 7+ proof record is created and evidenced.
- Dispatch live proof is still pending unless real dispatch evidence is captured.
- External security audit is pending.
- WAF/rate-limit deployment proof is pending unless platform evidence exists.
- Live ERP/freight connectors are pending; current posture is proof-mode/mock unless provider evidence exists.
- Mobile-native parity is not claimed; current mobile truth is trade-event capture only.
- Supabase advisor closure is pending.

## 4. Demo checklist

| Prep item | Detail |
|---|---|
| Browser tabs/pages | Dashboard, Leads, Catalog, Quote Q-00025, Orders/contract detail, Admin Audit, DCC. |
| Golden record IDs | Quote `Q-00025`; contract/order `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e`. |
| What not to click | Do not mutate Q-00025, sign/progress the golden contract, delete records, or run live connector actions. |
| Security answer | RLS is enabled on all public base tables and app-layer permission tests exist; advisor/RPC hardening and external audit remain open. |
| Mobile answer | Trade-event capture is the current mobile wedge; mobile-native parity is not claimed. |
| Integrations answer | Integration governance is modeled/tested; live ERP/freight connector proof remains pending. |
| Pilot answer | Pass 7 adds the pilot launch checklist, proof plan, success metrics, and support runbook. |

## 5. Investor Q&A table

| Question | Honest answer | Evidence |
|---|---|---|
| Is the core workflow real? | The lead → catalog → quote → accepted quote → draft order path is proven for the golden journey. | DCC, README, Q-00025, contract ID |
| Is it ready for a first pilot? | It is managed-pilot ready with caveats and a launch checklist; production-scale proof remains pending. | `docs/PILOT_CUSTOMER_LAUNCH_CHECKLIST.md` |
| Is security complete? | No. Security posture is documented and improved, but advisor closure and external audit remain pending. | Pass 6/7 Supabase advisor docs |
| Are live integrations ready? | Not claimed. Provider integration proof is still needed. | Claim reconciliation + readiness docs |
| Can contracts be signed? | The app includes signing logic, but live signed-contract proof should be captured on a new pilot record. | Pass 7 proof plan |
| Is dispatch proven? | Not yet. Dispatch evidence requires a new real proof record. | Pass 7 proof plan |
| Is mobile complete? | No. Mobile-native parity is not claimed. | DCC modules/readiness |
| What gets confidence to 100? | Advisor closure, external audit, deployed WAF, monitoring, backup drill, live connector, signed/dispatch proof, and pilot evidence. | `docs/BUYER_CONFIDENCE_TO_100.md` |
