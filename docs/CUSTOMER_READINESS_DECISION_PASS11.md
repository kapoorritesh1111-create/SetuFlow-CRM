# Customer Readiness Decision — Pass 11

Date: 2026-04-30  
Baseline: `SetuFlow-CRM-Pass10.zip`

## Decision summary

Current first-paying-customer readiness remains **92–95%**. The decision is **conditional go for a controlled pilot**, not unconditional launch.

No new pilot evidence, signed-contract proof, dispatch proof, monitoring proof, WAF proof, or applied Supabase remediation evidence was provided with Pass 11. Therefore the score should not be raised.

## Required evidence for first paying customer

A first paying customer can move from conditional to stronger launch readiness when the team captures:

1. New pilot workspace setup evidence.
2. Role/invitation evidence.
3. Product/pricing setup evidence.
4. First lead and quote evidence.
5. Accepted quote evidence.
6. New contract/order evidence.
7. Signed contract proof.
8. Document upload/compliance proof.
9. Dispatch/completion evidence.
10. Customer/operator feedback.
11. Support/incident log.
12. Monitoring and escalation evidence.

## Decision table

| Decision area | Evidence | Risk | Decision |
|---|---|---|---|
| Admin onboarding | SOP exists; no fresh customer-run evidence provided | Admin may still need founder/operator assistance | Conditional go |
| Core lead → quote flow | Golden journey proves accepted quote → draft order; no new pilot record evidence | Demo-safe, but first customer proof remains incomplete | Conditional go |
| Signed contract | Sign-contract gate exists; no live signed pilot contract evidence provided | Revenue path not fully proven end-to-end | Conditional blocker |
| Dispatch/completion | No live dispatch or completion evidence provided | Fulfilment proof remains open | Conditional blocker |
| Security/RPC trust | Plans/tests/drafts exist; live Supabase advisor findings remain open | Direct RPC exposure/advisor closure not proven | Conditional go only with operator controls |
| External audit | Audit prep/response pack exists; no audit report | Cannot claim audited posture | Not ready for audited-security claim |
| WAF/rate limiting | Evidence checklist exists; no deployed proof | Public route abuse controls not proven | Conditional blocker before broad launch |
| Monitoring/alerts | Proof checklist added; no provider evidence supplied | Incident response still manual | Conditional blocker before broad launch |
| Backup/restore | Checklist exists; no drill evidence | Recovery posture not proven | Conditional blocker before broad launch |
| Mobile-native parity | Explicitly not claimed | Buyer could misinterpret mobile scope | Safe if wording stays locked |

## Known risks

- Supabase advisor findings remain open.
- RPC grant hardening is drafted but not applied.
- Database-level capability checks are designed but not implemented live.
- No completed external security audit exists.
- No deployed WAF/rate-limit proof exists.
- No production monitoring proof exists.
- No backup/restore drill evidence exists.
- No new pilot signed-contract or dispatch proof exists.

## Manual workarounds for controlled pilot

- Founder/operator supervises first workspace setup.
- Owner/admin reviews roles before invite links are shared.
- Quotes/orders are reviewed through Admin → Audit until DB-level hardening is applied.
- Signed contract and dispatch should be captured on a new pilot proof record.
- WAF/monitoring/backups should be tracked as launch blockers, not hidden.

## Customer-facing non-claims

- Do not claim production-scale readiness.
- Do not claim external audit completion.
- Do not claim WAF/SIEM deployment.
- Do not claim automated secrets rotation.
- Do not claim live ERP/freight connector proof.
- Do not claim mobile-native parity.
- Do not claim signed/dispatch end-to-end proof until the new pilot proof record is captured.
